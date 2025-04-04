from alpaca.data.historical.stock import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from datetime import datetime, timedelta
# from dateutil.relativedelta import relativedelta

import os
import pytz
import pandas as pd
from collections import deque

from market_data_ingestors.constants import ALPACA_API_KEY, ALPACA_SECRET_KEY, TICKERS

class RiskEngine:

    def __init__(self) -> None:
        self.client = StockHistoricalDataClient(api_key=ALPACA_API_KEY, secret_key=ALPACA_SECRET_KEY)
        self.returns = {} # ticker : deque of returns
        self.latest_prices = {} # ticker : float
        self.AVAILABLE_TICKERS = set(TICKERS)
        self.subscribed_tickers = set()

    def __add_new_ticker(self, ticker, bucket_interval = TimeFrame.Minute, hours_offset = 1):
        if ticker not in self.AVAILABLE_TICKERS or ticker in self.subscribed_tickers:
            return

        # fetch data
        local_timezone = pytz.timezone('US/Eastern')
        now = datetime.now(local_timezone)
        start = (now - timedelta(hours=hours_offset))

        request_params = StockBarsRequest(
                            symbol_or_symbols=[ticker],
                            timeframe=bucket_interval,
                            start=start
                        )
        bars = self.client.get_stock_bars(request_params=request_params)[ticker]

        # transform
        bars = [dict(bar) for bar in bars]
        bars = pd.DataFrame(bars)
        bars['timestamp'] = pd.to_datetime(bars['timestamp']).dt.tz_convert('US/Eastern')
        bars['returns'] = bars['vwap'].pct_change()

        # update state
        self.returns[ticker] = deque((bars['returns'].to_list())[1:]) # first pct_change() will be NaN
        self.latest_prices[ticker] = bars['vwap'][-1]
        self.subscribed_tickers.add(ticker)




RiskEngine()


