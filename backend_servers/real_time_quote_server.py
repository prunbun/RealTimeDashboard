import redis
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
from database_utils.redis_client import ConsumerRedisClient, RedisChannel
from collections import defaultdict, deque
from datetime import datetime, timedelta
import numpy as np
import traceback

'''
redis database listener
'''
class QuotesWebsocketServer(ConsumerRedisClient):
    def __init__(self):
        super().__init__(message_handler=self._broadcast_message)
        self.subscribe(RedisChannel.QUOTE_UPDATES)
        self.all_quotes_subscribers = set()
        self.ticker_subscribers = defaultdict(set)
        self.websocket_to_tickers = defaultdict(set)
        self.one_min_moving_averages = {} # ticker : deque((timestamp, price)), total, count

    def connect(self, websocket):
        self.all_quotes_subscribers.add(websocket)
    
    def disconnect(self, websocket):
        self.all_quotes_subscribers.discard(websocket)
        if websocket in self.websocket_to_tickers:
            for ticker in self.websocket_to_tickers[websocket]:
                self.ticker_subscribers[ticker].discard(websocket)
            del self.websocket_to_tickers[websocket]
    
    def _compute_moving_average(self, message):
        ticker = message['ticker']
        ask_price, bid_price = float(message['ask_price']), float(message['bid_price'])
        timestamp_string = message['timestamp']

        # moving average calculations
        # add current mid_price to queue
        if ask_price != 0 and bid_price != 0:
            if ticker not in self.one_min_moving_averages:
                self.one_min_moving_averages[ticker] = [deque(), 0, 0]

            mid_price = (ask_price + bid_price) / 2
            self.one_min_moving_averages[ticker][0].append((timestamp_string, mid_price))
            self.one_min_moving_averages[ticker][1] += mid_price
            self.one_min_moving_averages[ticker][2] += 1

        # clean out queue and compute current moving average
        one_minute_ago = datetime.now() - timedelta(minutes=1)
        print('WINDOW HEALTH:', self.one_min_moving_averages[ticker][1], self.one_min_moving_averages[ticker][2])
        while self.one_min_moving_averages[ticker][0] and datetime.fromisoformat(self.one_min_moving_averages[ticker][0][0][0]) < one_minute_ago:

            old_timestamp, old_mid_price = self.one_min_moving_averages[ticker][0].popleft()
            self.one_min_moving_averages[ticker][1] -= old_mid_price
            self.one_min_moving_averages[ticker][2] -= 1
            

        one_min_moving_average = 0
        standard_deviation = 0
        if self.one_min_moving_averages[ticker][2]:
            one_min_moving_average = self.one_min_moving_averages[ticker][1] / self.one_min_moving_averages[ticker][2]
            standard_deviation = np.std(list(map(lambda x: x[1], self.one_min_moving_averages[ticker][0]))).item()
        print('STATS', ticker, one_min_moving_average, standard_deviation)
        message['window_stats'] = {
            'one_min_ma': one_min_moving_average,
            'higher_band_2_sigma': one_min_moving_average + 2 * standard_deviation,
            'lower_band_2_sigma': one_min_moving_average - 2 * standard_deviation,
        }

    async def _broadcast_message(self, message):
        message = json.loads(message)
        # print('server pubsub received:', message)

        ticker = message['ticker']
        self._compute_moving_average(message)
        print('computed stats', message)

        try:
            await self.__sendToTickerSubscribers(message=message, ticker=ticker)
            await self.__sendToGeneralSubscribers(message)
        except Exception as e:
            print('_broadcast_message try-catch', e)
        
    async def __sendToTickerSubscribers(self, message, ticker):
        await asyncio.gather(*(self.__attempt_send(client, message) for client in self.ticker_subscribers[ticker]))

    async def __sendToGeneralSubscribers(self, message):
        await asyncio.gather(*(self.__attempt_send(client, message) for client in self.all_quotes_subscribers))

    async def __attempt_send(self, client, message):
        try:
            await client.send_text(json.dumps(message))
        except Exception:
            self.disconnect(client)

    def subscribe_ticker(self, websocket, ticker):
        self.ticker_subscribers[ticker].add(websocket)
        self.websocket_to_tickers[websocket].add(ticker)
    
    def unsubscribe_ticker(self, websocket, ticker):
        self.ticker_subscribers[ticker].discard(websocket)

        if websocket in self.websocket_to_tickers:
            self.websocket_to_tickers[websocket].discard(ticker)


'''
FastAPI server setup
'''
runner = QuotesWebsocketServer()
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(runner.redis_listener()) # Start the Redis listener in the background
    yield # yields control to FastAPI
    runner.stop() # stops the listen() loop
    task.cancel() # sends a CancelledError signal to redis_listener()

app = FastAPI(lifespan=lifespan)

'''
endpoints
'''
@app.websocket("/ws")
async def subscribe_stock_data(websocket: WebSocket):
    await websocket.accept()
    runner.connect(websocket)

    try:
        while True:
            await asyncio.sleep(1000)
    except WebSocketDisconnect:
        runner.disconnect(websocket)

@app.websocket("/quotes_ticker_stream")
async def quotes_ticker_stream(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            ticker = data.get("ticker")

            if action == "subscribe" and ticker:
                runner.subscribe_ticker(websocket=websocket, ticker=ticker)
            elif action == 'unsubscribe' and ticker:
                runner.unsubscribe_ticker(websocket=websocket, ticker=ticker)

            await asyncio.sleep(0.01)

    except WebSocketDisconnect:
        runner.disconnect(websocket=websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

