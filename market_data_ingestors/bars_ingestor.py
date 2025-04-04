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
    
class BarsIngestor:

    def __init__(self, max_updates_per_second=100):
        # database setup
        self.redis_client = ProducerRedisClient()

        # alpaca client setup
        self.alpaca_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)

    async def bars_data_handler(self, data):
        bars_dict = {
            'ticker': data['S'], 
            'open': data['o'],
            'high': data['h'],
            'low': data['l'],
            'close': data['c'],
            'timestamp': str(data['t'].to_datetime())
        }
        print('bars handler', data, bars_dict)
        await self.redis_client.store_and_publish(key=data['S'], data_dict=bars_dict, channels=[RedisChannel.QUOTE_UPDATES], keyspace='bars')

    def subscribe_bars(self, tickers):
        self.alpaca_client.subscribe_bars(self.bars_data_handler, *(tickers)) 

    def start(self):
        self.alpaca_client.run()


if __name__ == "__main__":
    print('LIVE BARS')
    ingestor = BarsIngestor()
    ingestor.subscribe_bars(TICKERS)
    ingestor.start()

