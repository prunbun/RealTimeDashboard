import redis
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
from database_utils.redis_client import ConsumerRedisClient, RedisChannel
from collections import defaultdict

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

    def connect(self, websocket):
        self.all_quotes_subscribers.add(websocket)
    
    def disconnect(self, websocket):
        self.all_quotes_subscribers.discard(websocket)
        if websocket in self.websocket_to_tickers:
            for ticker in self.websocket_to_tickers[websocket]:
                self.ticker_subscribers[ticker].discard(websocket)
            del self.websocket_to_tickers[websocket]
        
    async def _broadcast_message(self, message):
        message = json.loads(message)
        print('server pubsub received:', message)
        ticker = message["ticker"]

        await self.__sendToTickerSubscribers(message=message, ticker=ticker)
        await self.__sendToGeneralSubscribers(message)
        
    async def __sendToTickerSubscribers(self, message, ticker):
        await asyncio.gather(*(client.send_text(json.dumps(message)) for client in self.ticker_subscribers[ticker]))

    async def __sendToGeneralSubscribers(self, message):
        await asyncio.gather(*(client.send_text(json.dumps(message)) for client in self.all_quotes_subscribers))

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

