from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import psycopg2
from database_utils.config import load_config

from database_utils.redis_client import RedisClient
import json
import re
from decimal import Decimal

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
        
            
    def __place_buy(self, request: TradeRequest, bid_price: float):
        '''
        if BUY:
            check if there are sufficient funds
            update/open the position for the user
            update trading account
        '''

        POS_DETAILS_SQL = """
        SELECT * FROM user_positions
        WHERE user_id = %s AND ticker = %s
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
        SET available_cash = %s 
        WHERE user_id = %s
        """

        # protect against sql injection attacks
        if not re.fullmatch(r'^[A-Z]{1,5}$', request.ticker):
            return {'message': f"Invalid ticker symbol: {request.ticker}"}

        requested_funds = request.qty * bid_price
        account_details = self.get_trading_account_details(request.username)

        if requested_funds > account_details['available_cash']:
            return {'message': f"Insufficient funds to place BUY trade!"}

        try:

            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:

                    # update the user position        
                    cur.execute(POS_DETAILS_SQL, (account_details['user_id'], request.ticker))
                    result = cur.fetchone()
            
                    if not result:
                        new_qty = request.qty
                        new_total_value = requested_funds
                        cur.execute(INSERT_POS_SQL, (account_details['user_id'], request.ticker, new_qty, new_total_value))

                    else:
                        column_names = [desc[0] for desc in cur.description]
                        current_position = dict(zip(column_names, result))

                        new_qty = current_position['qty'] + request.qty
                        new_total_value = current_position['total_value'] + Decimal(requested_funds)

                    # changes to the account
                    new_available_cash = account_details['available_cash'] - Decimal(requested_funds)

                    # write the changes back to the account
                    cur.execute(UPDATE_POS_SQL, (new_qty, new_total_value, account_details['user_id'], request.ticker))
                    cur.execute(UPDATE_ACCT_SQL, (new_available_cash, account_details['user_id']))

                    conn.commit()
                    return {'message': f"BUY trade [ {request.ticker}: {request.qty} @ ${bid_price} ] placed successfully!"}
        
        except Exception as e:
            print(e)
            return {'message': f"Error placing BUY trade!"}
    
    
    def __place_sell(self, request: TradeRequest, ask_price: float):
        '''
        if SELL:
            check if there is sufficient qty
            update position for the user
            update trading account
        '''
        # ADD IN ABILITY TO GO NEGATIVE IN THE BUY AND GET A PROFIT FOR SHORTING
        return {'message': f"Error placing trade. Operation {request.op} is unrecognized"}

            
    def place_trade(self, request: TradeRequest):
        '''
        fetch the stock price
        route the request to the respective handler
        '''

        ticker = request.ticker.upper()
        ticker_data = self.redis_client.getFromCache(ticker)
        bid_price, ask_price = float(ticker_data['bid_price']), float(ticker_data['ask_price'])

        if request.op == 'BUY':
            return self.__place_buy(request, bid_price=bid_price)
        elif request.op == 'SELL':
            return self.__place_sell(request, ask_price=ask_price)
        else:
            return {'message': f"Error placing trade. Operation {request.op} is unrecognized"}
        
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

@app.post("/trade")
def placeTrade(request: TradeRequest):
    print(request)
    return manager.place_trade(request=request)

@app.get("/reset/{username}")
def reset_account(username: str):
    return manager.reset_account(username)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)