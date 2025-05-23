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
from database_utils.redis_client import ProducerRedisClient, RedisChannel
from market_data_ingestors.constants import ALPACA_API_KEY, ALPACA_SECRET_KEY, TICKERS



class LeakyBucket:

    def __init__(self, redis_client: ProducerRedisClient, capacity = 2, num_refresh_per_second = 0.2):
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
                    'bid_qty': data['bs'],
                    'ask_price': data['ap'],
                    'ask_qty': data['as'], 
                    'timestamp': str(data['t'].to_datetime())
                }
                print('leaky consumer', data)
                # stock_counts[data['S']] += 1
                await self.redis_client.store_and_publish(key=data['S'], data_dict=quote_dict, channels=[RedisChannel.QUOTE_UPDATES])

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
    
class QuoteIngestor:

    def __init__(self, max_updates_per_second=100):
        # database setup
        self.redis_client = ProducerRedisClient()

        # alpaca client setup
        self.alpaca_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)
        self.rate_limiter = AsyncLimiter(max_updates_per_second,1) # rate limiter with leaky bucket algorithm, num requests / time_stamp
        self.leaky_buckets = defaultdict(lambda: LeakyBucket(self.redis_client))

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
        redis_client = ProducerRedisClient()
        while True:
            for ticker in TICKERS:
                quote_dict = generate_random_quote(ticker)
                print('simulated', quote_dict)
                await redis_client.store_and_publish(key=ticker, data_dict=quote_dict, channels=[RedisChannel.QUOTE_UPDATES])

            await asyncio.sleep(1)

    loop = asyncio.get_event_loop()
    loop.create_task(simulate_quotes())
    loop.run_forever()

if __name__ == "__main__":
    simulate_trades = True
    if simulate_trades:
        print('SIMULATION, NOT LIVE DATA')
        run_simulator()
    else:
        print('LIVE DATA')
        ingestor = QuoteIngestor()
        ingestor.subscribe_quotes(TICKERS)
        ingestor.start()

