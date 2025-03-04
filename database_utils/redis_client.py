import redis
import asyncio
import json

from enum import Enum

class RedisChannel(Enum):
    QUOTE_UPDATES = 'quote_updates'

class RedisClient:
    def __init__(self, port=6379, db_idx=0, decode_responses=True):
        self.redis_client = redis.Redis(host='localhost', port=port, db=db_idx, decode_responses=decode_responses)

class ProducerRedisClient(RedisClient):

    def __init__(self, port=6379, db_idx=0, decode_responses=True):
        super().__init__(port=port, db_idx=db_idx, decode_responses=decode_responses)
        self.redis_client.flushdb()

    async def store_and_publish(self, key: str, data_dict, channels: list[RedisChannel] = [], keyspace:str = 'ticker'):
        self.redis_client.set(f"{keyspace}:{key}", json.dumps(data_dict))
        
        for channel in channels:
            self.redis_client.publish(channel.value, json.dumps(data_dict))

class ConsumerRedisClient(RedisClient):

    def __init__(self, port=6379, db_idx=0, decode_responses=True, message_handler=None):
        super().__init__(port=port, db_idx=db_idx, decode_responses=decode_responses)
        self.subscriber = self.redis_client.pubsub()
        self.listening = True
        self.message_handler = message_handler if message_handler else self.default_handler

    def subscribe(self, channel_name: RedisChannel.QUOTE_UPDATES):
        self.subscriber.subscribe(channel_name.value)

    def unsubscribe(self, channel_name):
        self.subscriber.unsubscribe(channel_name)

    def stop(self):
        self.listening = False
        self.subscriber.unsubscribe()
        self.subscriber.close()

    async def redis_listener(self):
        try:
            async for message in self.listen():
                if not self.listening:
                    break
                if message['type'] == 'message':
                    await self.message_handler(message["data"])
        except asyncio.CancelledError:
            print("Redis listener stopped.")

    async def listen(self):
        loop = asyncio.get_event_loop()
        while self.listening:
            message = await loop.run_in_executor(None, self.subscriber.get_message, True, 1.0)
            if message:
                yield message

    async def default_handler(self, message):
        print(f"Received message: {message}")