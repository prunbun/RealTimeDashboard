import redis
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
from database_utils.redis_client import ConsumerRedisClient, RedisChannel

'''
redis database listener
'''
class QuotesWebsocketServer(ConsumerRedisClient):
    def __init__(self):
        super().__init__(message_handler=self._broadcast_message)
        self.subscribe(RedisChannel.QUOTE_UPDATES)
        self.connected_clients = set()

    def connect(self, websocket):
        self.connected_clients.add(websocket)
    
    def disconnect(self, websocket):
        self.connected_clients.remove(websocket)
        
    async def _broadcast_message(self, message):
        disconnected_clients = set()
        print(message)
        for client in self.connected_clients:
            try:
                await client.send_text(message)
            except:
                disconnected_clients.add(client)  # Mark for removal

        for client in disconnected_clients:
            self.connected_clients.remove(client)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

