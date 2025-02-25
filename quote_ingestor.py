from alpaca.data.live import StockDataStream

from aiolimiter import AsyncLimiter

import redis

import json
import os


redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
redis_client.flushdb()
async def store_quote_to_redis(quote_dict):

    # overwrites previous price for this ticker
    redis_client.set(f"ticker:{quote_dict['ticker']}", json.dumps(quote_dict))
    redis_client.publish("quote_updates", json.dumps(quote_dict))


rate_limiter = AsyncLimiter(2, 1) # rate limiter with leaky bucket algorithm, num requests / time_stamp
async def quote_data_handler(data):
    async with rate_limiter:

        quote_dict = {
            'ticker': data['S'], 
            'bid_price': data['bp'], 
            'ask_price': data['ap'], 
            'timestamp': str(data['t'].to_datetime())
        }
        await store_quote_to_redis(quote_dict)


def run_data_ingestor():
    ALPACA_API_KEY = os.getenv("ALPACA_PAPER_KEY")
    ALPACA_SECRET_KEY = os.getenv("ALPACA_PAPER_SECRET")

    wss_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)
    wss_client.subscribe_quotes(quote_data_handler, "AAPL", "MSFT")
    wss_client.run()

if __name__ == "__main__":
    run_data_ingestor()





