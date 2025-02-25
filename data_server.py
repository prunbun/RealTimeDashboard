import redis
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager

'''
database listener
'''
redis_client = redis.Redis(host='localhost', port = 6379, db = 0, decode_responses=True)
connected_clients = set()

async def redis_listener():
    subscriber = redis_client.pubsub()
    subscriber.subscribe("quote_updates")

    while True:
        for message in subscriber.listen():
            if message['type'] == 'message':
                for client in connected_clients:
                    await client.send_text(message["data"])


'''
the FastAPI app
'''

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(redis_listener())
    yield

app = FastAPI(lifespan=lifespan)

@app.websocket("/ws")
def subscribe_stock_data(websocket: WebSocket):
    websocket.accept()
    connected_clients.add(websocket)

    try:
        while True:
            asyncio.sleep(1000)

    except WebSocketDisconnect:
        connected_clients.remove(websocket)

