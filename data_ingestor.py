from alpaca.data.live import StockDataStream
import os

ALPACA_API_KEY = os.getenv("ALPACA_PAPER_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_PAPER_SECRET")

idx = 0
async def quote_data_handler(data):
    global idx
    if idx == 0:
        ticker, bid_price, ask_price = data['S'], data['bp'], data['ap']
        print(ticker, bid_price, ask_price)
    
    idx = (idx + 1) % 15

wss_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)
wss_client.subscribe_quotes(quote_data_handler, "AAPL")
wss_client.run()




