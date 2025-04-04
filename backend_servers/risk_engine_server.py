from alpaca.data.historical.stock import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from datetime import datetime, timedelta
# from dateutil.relativedelta import relativedelta

import os
import pytz
import pandas as pd

from market_data_ingestors.quote_ingestor import TICKERS

class RiskEngine:

    def __init__(self) -> None:
        # subscribe to minute bars and initialize data structures
        # at client websocket init, we want the handler to call the new position open 

        # when a new position is opened
            # for each ticker, maintain a queue of latest returns and latest single price
            # calculate percentages for each one and store them

        # any time a position is closed out, we also have a function that is called, which frees the data structures here

        # every time we get a new minute bar or initialize a new open positition, we use pubsub to send to the websocket, which then streams the data of the new VaR for that
        # ticker to the client
        pass
    pass


# fetch last 1 hour's minute bars
# print(TICKERS)
ALPACA_API_KEY = os.getenv("ALPACA_PAPER_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_PAPER_SECRET")
CLIENT = StockHistoricalDataClient(api_key=ALPACA_API_KEY, secret_key=ALPACA_SECRET_KEY)

local_timezone = pytz.timezone('US/Eastern')
now = datetime.now(local_timezone)
start = now - timedelta(hours=1)

request_params = StockBarsRequest(
                    symbol_or_symbols=['GOOG'],
                    timeframe=TimeFrame.Minute,
                    start=start
                )


bars = CLIENT.get_stock_bars(request_params=request_params)['GOOG']
bars = [dict(bar) for bar in bars]
bars = pd.DataFrame(bars)
print(bars)