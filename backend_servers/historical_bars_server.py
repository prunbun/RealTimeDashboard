from alpaca.data.historical.stock import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import pandas as pd
import os
import sys
import traceback

ALPACA_API_KEY = os.getenv("ALPACA_PAPER_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_PAPER_SECRET")
CLIENT = StockHistoricalDataClient(api_key=ALPACA_API_KEY, secret_key=ALPACA_SECRET_KEY)

class CandlestickRequests(BaseModel):
    ticker: str
    bucket_interval: str
    timeframe: str

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

def _parse_request(request: CandlestickRequests):
    parsed_params = {}

    # parse ticker
    parsed_params['ticker'] = request.ticker.upper()

    # parse bucket interval
    bucket_interval = None

    match request.bucket_interval.upper():
        case 'MINUTE':
            bucket_interval = TimeFrame.Minute
        case 'HOUR':
            bucket_interval = TimeFrame.Hour
        case 'DAY':
            bucket_interval = TimeFrame.Day
        case _:
            raise HTTPException(404, f"{request.bucket_interval} is not valid!")
        
    parsed_params['bucket_interval'] = bucket_interval

    # parse timeframe
    start = None
    now = datetime.now()
    match request.timeframe.upper():
        case '1DAY':
            start = now - timedelta(days = 1)
        case '5DAYS':
            start = now - timedelta(days = 5)
        case '1MONTH':
            start = now - relativedelta(months=1)
        case '6MONTHS':
            start = now - relativedelta(months=6)
        case 'YTD':
            start = datetime(now.year, 1, 1)
        case _:
            raise HTTPException(404, f"{request.timeframe} is not valid!")
    
    parsed_params['start'] = start

    return parsed_params


def fetch_candlestick_data(request: CandlestickRequests):

    parsed_params = _parse_request(request=request)

    request_params = StockBarsRequest(
                    symbol_or_symbols=[parsed_params['ticker']],
                    timeframe=parsed_params['bucket_interval'],
                    start=parsed_params['start']
                 )

    try:
        bars = CLIENT.get_stock_bars(request_params=request_params)[parsed_params['ticker']]

        data = [{
            "timestamp": str(bar.timestamp),
            "open": bar.open,
            "high": bar.high,
            "low": bar.low,
            "close": bar.close,
            "volume": bar.volume
        } for bar in bars]

        return data
    
    except Exception as e:
        print(e)
        traceback.print_exc(file=sys.stdout)
        raise HTTPException(404, 'server-sid issue with fetching data')

'''
endpoints
'''
@app.post("/historical")
def get_candlestick_data(request: CandlestickRequests):
    print("Received request:", request)
    candlestick_data = fetch_candlestick_data(request=request)
    return {"ticker": request.ticker, "candlesticks": candlestick_data}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)


