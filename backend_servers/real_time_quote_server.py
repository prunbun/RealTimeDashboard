import redis
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager

'''
redis database listener
'''
class BackgroundRunner:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.subscriber = self.redis_client.pubsub()
        
        self.subscriber.subscribe("quote_updates")
        self.connected_clients = set()
        self.listening = True

    async def redis_listener(self):
        try:
            async for message in self.listen(): # this will infinitely return messages as they come in from the subscriber pipeline
                if not self.listening:
                    break

                if message['type'] == 'message':

                    disconnected_clients = set()
                    for client in self.connected_clients:
                        try:
                            await client.send_text(message["data"])
                        except:
                            disconnected_clients.add(client)  # Mark for removal

                    # remove stale connections
                    for client in disconnected_clients:
                        self.connected_clients.remove(client)

        except asyncio.CancelledError:
            print("Redis listener stopped.")

    async def listen(self):
        loop = asyncio.get_event_loop()
        while self.listening:
            # 'None' is for use specific thread pool, 'True' is is_blocking, and 1.0 is timeout in seconds
            message = await loop.run_in_executor(None, self.subscriber.get_message, True, 1.0) 
            if message:
                yield message

    def stop(self):
        self.listening = False
        self.subscriber.unsubscribe()
        self.subscriber.close()

'''
FastAPI server setup
'''
runner = BackgroundRunner()
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
    runner.connected_clients.add(websocket)

    try:
        while True:
            await asyncio.sleep(1000)
    except WebSocketDisconnect:
        runner.connected_clients.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

