from alpaca.data.live import StockDataStream

from aiolimiter import AsyncLimiter

import redis

import json
import os
import random
from datetime import datetime
import asyncio
import time
from collections import defaultdict, deque

TICKERS = ['AAPL', 'AMZN', 'MSFT', 'NFLX', 'GOOG', 'DDOG', 'NVDA', 'AMD']

# stock_counts = defaultdict(int)
class RedisClient:

    def __init__(self, port=6379, db_idx=0, decode_responses=True):
        self.redis_client = redis.Redis(host='localhost', port=port, db=db_idx, decode_responses=decode_responses)
        self.redis_client.flushdb()

    async def store_quote_to_redis(self, quote_dict):
        # overwrites previous price for this ticker
        self.redis_client.set(f"ticker:{quote_dict['ticker']}", json.dumps(quote_dict))
        self.redis_client.publish("quote_updates", json.dumps(quote_dict))

class LeakyBucket:

    def __init__(self, redis_client: RedisClient, capacity = 2, num_refresh_per_second = 0.2):
        self.redis_client = redis_client
        self.messages = deque()
        self.current_threshold = capacity

        self.IDLE_CAPACITY = capacity
        self.REFRESH_RATE = num_refresh_per_second

        self.queue_lock = asyncio.Lock()
        self.capacity_lock = asyncio.Lock()

        loop = asyncio.get_event_loop()
        loop.create_task(self.leak())
        loop.create_task(self.refresh())

    async def leak(self, amount = 2, num_seconds = 1):

        while True:
            await self.queue_lock.acquire()

            if not self.messages:
                self.queue_lock.release()

            else:
                data = self.messages.popleft()

                quote_dict = {
                    'ticker': data['S'], 
                    'bid_price': data['bp'], 
                    'ask_price': data['ap'], 
                    'timestamp': str(data['t'].to_datetime())
                }
                print('leaky consumer', data)
                # stock_counts[data['S']] += 1
                await self.redis_client.store_quote_to_redis(quote_dict)

                await self.capacity_lock.acquire()
                self.current_threshold = max(self.IDLE_CAPACITY, self.current_threshold - 1)
                self.capacity_lock.release()

                self.queue_lock.release()

            await asyncio.sleep(num_seconds / amount)

    async def refresh(self):
        
        while True:
            async with self.queue_lock, self.capacity_lock:
                if len(self.messages) < self.IDLE_CAPACITY:
                    self.current_threshold += 1

            await asyncio.sleep(1 / self.REFRESH_RATE)

    async def accept(self, data):
        async with self.queue_lock, self.capacity_lock:
            if len(self.messages) < self.current_threshold:
                self.messages.append(data)
            
        return
    
class DataIngestor:

    def __init__(self, max_updates_per_second=100):
        # database setup
        self.redis_client = RedisClient()

        # alpaca client setup
        ALPACA_API_KEY = os.getenv("ALPACA_PAPER_KEY")
        ALPACA_SECRET_KEY = os.getenv("ALPACA_PAPER_SECRET")
        self.alpaca_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)
        self.rate_limiter = AsyncLimiter(max_updates_per_second,1) # rate limiter with leaky bucket algorithm, num requests / time_stamp
        self.leaky_buckets = defaultdict(lambda: LeakyBucket(self.redis_client))

        # managed state initialization
        self.subscribed_quote_tickers = set()

    async def quote_data_handler(self, data):
        async with self.rate_limiter:
            # stock_counts[data['S']] += 1
            await self.leaky_buckets[data['S']].accept(data)
            # print(stock_counts)

    def subscribe_quotes(self, tickers):
        self.alpaca_client.subscribe_quotes(self.quote_data_handler, *(tickers)) 

    def start(self):
        self.alpaca_client.run()

'''
simulator
'''
def run_simulator():

    def generate_random_quote(ticker):
        bid_price = round(random.uniform(100, 150), 2)
        ask_price = round(bid_price + random.uniform(0.01, 1), 2)  # Ask price slightly higher than bid
        timestamp = datetime.now().isoformat()  # Use current time as timestamp
        
        return {
            'ticker': ticker,
            'bid_price': bid_price,
            'ask_price': ask_price,
            'timestamp': timestamp
        }

    async def simulate_quotes():
        redis_client = RedisClient()
        while True:
            for ticker in TICKERS:
                quote_dict = generate_random_quote(ticker)
                print('simulated', quote_dict)
                await redis_client.store_quote_to_redis(quote_dict)

            await asyncio.sleep(0.01)

    loop = asyncio.get_event_loop()
    loop.create_task(simulate_quotes())
    loop.run_forever()

if __name__ == "__main__":
    simulate_trades = False
    if simulate_trades:
        print('SIMULATION, NOT LIVE DATA')
        run_simulator()
    else:
        print('LIVE DATA')
        ingestor = DataIngestor()
        ingestor.subscribe_quotes(TICKERS)
        ingestor.start()

