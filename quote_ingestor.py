from alpaca.data.live import StockDataStream

from aiolimiter import AsyncLimiter

import redis

import json
import os
import random
from datetime import datetime
import asyncio



'''
redis
'''
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
redis_client.flushdb()
async def store_quote_to_redis(quote_dict):

    # overwrites previous price for this ticker
    redis_client.set(f"ticker:{quote_dict['ticker']}", json.dumps(quote_dict))
    redis_client.publish("quote_updates", json.dumps(quote_dict))


'''
real market data
'''
rate_limiter = AsyncLimiter(2, 1) # rate limiter with leaky bucket algorithm, num requests / time_stamp
async def quote_data_handler(data):
    async with rate_limiter:

        quote_dict = {
            'ticker': data['S'], 
            'bid_price': data['bp'], 
            'ask_price': data['ap'], 
            'timestamp': str(data['t'].to_datetime())
        }
        print(data)
        await store_quote_to_redis(quote_dict)


def run_data_ingestor():
    ALPACA_API_KEY = os.getenv("ALPACA_PAPER_KEY")
    ALPACA_SECRET_KEY = os.getenv("ALPACA_PAPER_SECRET")

    wss_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)
    wss_client.subscribe_quotes(quote_data_handler, "AAPL")
    wss_client.run()


'''
simulator
'''
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
    tickers = ['AAPL']
    while True:
        for ticker in tickers:
            quote_dict = generate_random_quote(ticker)
            print('simulated', quote_dict)
            await store_quote_to_redis(quote_dict)

        await asyncio.sleep(1)

def run_simulator():
    loop = asyncio.get_event_loop()
    loop.create_task(simulate_quotes())
    loop.run_forever()

if __name__ == "__main__":
    if True:
        print('SIMULATION, NOT LIVE DATA')
        run_simulator()
    else:
        print('LIVE DATA')
        run_data_ingestor()




