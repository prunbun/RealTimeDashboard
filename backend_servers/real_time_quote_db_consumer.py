import redis
import psycopg2
from psycopg2.extras import execute_batch
import json
from datetime import datetime
from database_utils.config import load_config
from database_utils.redis_client import ConsumerRedisClient, RedisChannel
import asyncio


INSERT_SQL = """
INSERT INTO quotes_time_series (ticker, bid_price, bid_qty, ask_price, ask_qty, ts)
VALUES (%s, %s, %s, %s, %s, %s);
"""

# NOTE: TimescaleDB now does auto-retention policy based on its time indices!
# DELETE_STALE_FIXED_QTY_SQL = """
# WITH keep AS (
#     SELECT ts from quotes_time_series
#     ORDER BY ts DESC
#     LIMIT %s
# )
# DELETE FROM quotes_time_series
# WHERE ts NOT IN (select ts FROM keep);
# """

# DELETE_STALE_TIME_INTERVAL_SQL = """
# DELETE FROM quotes_time_series
# WHERE ts < NOW() - INTERVAL %s;
# """

class QuoteDBConsumer:

    def __init__(self, write_batch_size = 50):
        # state
        self.batched_data = []
        self.BATCH_SIZE = write_batch_size

        # postgres config
        self.db_config = load_config()

        # redis pubsub
        self.redis_client = ConsumerRedisClient(message_handler=self._store_data)
        self.redis_client.subscribe(RedisChannel.QUOTE_UPDATES)
        asyncio.create_task(self.redis_client.redis_listener())
        
    async def _store_data(self, data):
        try:

            data_dict = json.loads(data)

            ticker = data_dict['ticker']
            bid_price = float(data_dict['bid_price'])
            bid_qty = int(data_dict['bid_qty'])
            ask_price = float(data_dict['ask_price'])
            ask_qty = int(data_dict['ask_qty'])
            timestamp = data_dict['timestamp']

            parsed_data = (ticker, bid_price, bid_qty, ask_price, ask_qty, timestamp)
            self.batched_data.append(parsed_data)

            if len(self.batched_data) >= self.BATCH_SIZE:
                # store into the db
                with psycopg2.connect(**self.db_config) as conn:
                    with conn.cursor() as cur:
                        execute_batch(cur, INSERT_SQL, self.batched_data)
                        conn.commit()
                        print("Batch insert successful!")
                self.batched_data = []

        except Exception as e:
            print(f"Error processing data: {e}")

async def main():
    server = QuoteDBConsumer()
    while True:
        await asyncio.sleep(100)

if __name__ == "__main__":
    asyncio.run(main())