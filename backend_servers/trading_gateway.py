from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import psycopg2
from database_utils.config import load_config

from database_utils.redis_client import RedisClient
import json
import re
import traceback
import sys
from decimal import Decimal

POS_DETAILS_SQL = """
SELECT * FROM user_positions
WHERE user_id = %s AND ticker = %s
"""

ALL_POS_SQL = """
SELECT * FROM user_positions
WHERE user_id = (SELECT id FROM user_info WHERE username = %s)
"""

INSERT_POS_SQL = """
INSERT INTO user_positions (user_id, ticker, qty, total_value)
VALUES (%s, %s, %s, %s)
"""

UPDATE_POS_SQL = """
UPDATE user_positions
SET qty = %s, total_value = %s
WHERE user_id = %s AND ticker = %s
"""

UPDATE_ACCT_SQL = """
UPDATE trading_account_info
SET available_cash = %s, net_profit = %s
WHERE user_id = %s
"""

class TradeRequest(BaseModel):
    username: str
    ticker: str
    qty: int
    op: str

class AccountManager:

    def __init__(self) -> None:
        self.db_config = load_config()
        self.redis_client = RedisClient()

    def get_trading_account_details(self, username):
        ACC_DETAIL_SQL = """
        SELECT account_id, user_id, available_cash, net_liquidity, net_profit FROM trading_account_info ta
        WHERE ta.user_id = (SELECT id FROM user_info ui WHERE ui.username = %s);
        """

        with psycopg2.connect(**self.db_config) as conn:
            with conn.cursor() as cur:
                cur.execute(ACC_DETAIL_SQL, (username,))
                result = cur.fetchone()

                if not result:
                    raise HTTPException(404, f"Trading account details for {username} not found")
                
                # get headers and zip them with the data we fetched (tuple)
                column_names = [desc[0] for desc in cur.description]
                return dict(zip(column_names, result))
        
    def __calc_position(self, current_position, account_details, request: TradeRequest, new_price):

        new_qty = None
        new_total_value = None
        new_profit = None

        if current_position['qty'] == 0:
            new_qty = (-1 if request.op == 'SELL' else 1) * request.qty
            new_total_value = request.qty * new_price
            new_profit = account_details['net_profit']
            
        elif current_position['qty'] > 0 and request.op == 'SELL' or current_position['qty'] < 0 and request.op == 'BUY':
            old_cost_basis = current_position['total_value'] / Decimal(abs(current_position['qty']))
            new_qty = current_position['qty'] + (-1 if request.op == 'SELL' else 1) * request.qty
            if request.op == 'SELL':
                new_total_value = current_position['total_value'] - Decimal(old_cost_basis * request.qty) if new_qty >= 0 else abs(new_qty) * new_price
                profit_delta = (Decimal(new_price) - old_cost_basis) * min(abs(current_position['qty']), request.qty)
            else:
                new_total_value = current_position['total_value'] - Decimal(old_cost_basis * request.qty) if new_qty <= 0 else new_qty * new_price
                profit_delta = (old_cost_basis - Decimal(new_price)) * min(abs(current_position['qty']), request.qty)
            
            new_profit = account_details['net_profit'] + Decimal(profit_delta)

        else:
            new_qty = current_position['qty'] + (-1 if request.op == 'SELL' else 1) * request.qty
            new_total_value = current_position['total_value'] + Decimal(request.qty * new_price)
            new_profit = account_details['net_profit']

        return (new_qty, new_total_value, new_profit)
        
    def __place_order(self, request: TradeRequest, new_price: float):
        '''
        if SELL:
            update position for the user
            update trading account
        '''

        account_details = self.get_trading_account_details(request.username)
        raw_value = request.qty * new_price

        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:

                    # update the user position        
                    cur.execute(POS_DETAILS_SQL, (account_details['user_id'], request.ticker))
                    result = cur.fetchone()

                    new_profit = account_details['net_profit']
            
                    if not result:
                        new_qty = (-1 if request.op == 'SELL' else 1) * request.qty
                        new_total_value = raw_value
                        cur.execute(INSERT_POS_SQL, (account_details['user_id'], request.ticker, new_qty, new_total_value))

                    else:
                        column_names = [desc[0] for desc in cur.description]
                        current_position = dict(zip(column_names, result))

                        new_qty, new_total_value, new_profit = self.__calc_position(current_position, account_details, request, new_price)

                    # changes to the account
                    new_available_cash = account_details['available_cash'] + (-1 if request.op == 'BUY' else 1) * Decimal(raw_value)

                    # write the changes back to the account
                    cur.execute(UPDATE_POS_SQL, (new_qty, new_total_value, account_details['user_id'], request.ticker))
                    cur.execute(UPDATE_ACCT_SQL, (new_available_cash, new_profit, account_details['user_id']))

                    conn.commit()
                    return {'message': f"{request.op.upper()} trade [ {request.ticker}: {request.qty} @ ${new_price} ] placed successfully!"}
                
        except Exception as e:
            print(e)
            traceback.print_exc(file=sys.stdout)
            return {'message': f"Error placing SELL trade!"}

            
    def place_trade(self, request: TradeRequest):
        '''
        fetch the stock price
        route the request to the respective handler
        '''

        # protect against sql injection attacks 
        ticker = request.ticker.upper()
        if not re.fullmatch(r'^[A-Z]{1,5}$', request.ticker):
            return {'message': f"Invalid ticker symbol: {request.ticker}"}

        ticker_data = self.redis_client.getFromCache(ticker)
        bid_price, ask_price = float(ticker_data['bid_price']), float(ticker_data['ask_price'])

        if bid_price <= 0 or ask_price <= 0:
            return {'message': f"Error placing trade. Instrument is unavailable at the moment!"}

        request.op = request.op.upper()
        if request.op != 'BUY' and request.op != 'SELL':
            return {'message': f"Error placing trade. Operation {request.op} is unrecognized"}
        
        return self.__place_order(request, ask_price if request.op == 'BUY' else bid_price)
        
    def reset_account(self, username: str):
        RESET_ACCOUNT_SQL = """
        UPDATE trading_account_info
        SET available_cash = DEFAULT, net_liquidity = DEFAULT, reset_balance = DEFAULT, net_profit = DEFAULT
        WHERE user_id = (SELECT id FROM user_info WHERE username = %s);
        """

        RESET_POS_SQL = """
        DELETE FROM user_positions
        WHERE user_id = (SELECT id FROM user_info WHERE username = %s);
        """

        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:
                    cur.execute(RESET_ACCOUNT_SQL, (username,))
                    cur.execute(RESET_POS_SQL, (username,))

                    conn.commit()
                    return {'message': "Account reset successfully!"}
                
        except Exception as e:
            print(e)
            return {'message': "Error resetting account"}
        
    def get_positions(self, username: str):
        '''
        get the rows with positions available
        format them into ticker:qty dict
        return the dict
        '''

        with psycopg2.connect(**self.db_config) as conn:
            with conn.cursor() as cur:
                cur.execute(ALL_POS_SQL, (username,))
                result = cur.fetchall()

                positions = {}
                for record in result:
                    positions[record[2]] = {'qty': int(record[3]), 'data': self.redis_client.getFromCache(record[2])}

                return positions
                

'''
FastAPI setup
'''
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

'''
server state
'''
manager = AccountManager()

'''
endpoints
'''
@app.get("/account/{username}")
def get_account_details(username: str):
    account_details = manager.get_trading_account_details(username=username)
    del account_details['user_id']
    return account_details

@app.get("/positions/{username}")
def get_user_positions(username: str):
    return manager.get_positions(username)

@app.post("/trade")
def place_trade(request: TradeRequest):
    print(request)
    return manager.place_trade(request=request)

@app.get("/reset/{username}")
def reset_account(username: str):
    return manager.reset_account(username)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)