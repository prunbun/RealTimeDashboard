from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from database_utils.config import load_config


class AccountManager:

    def __init__(self) -> None:
        self.db_config = load_config()

    def get_details(self, username):
        ACC_DET_SQL = """
        SELECT account_id, available_cash, net_liquidity, net_profit FROM trading_account_info ta
        WHERE ta.user_id = (SELECT id FROM user_info ui WHERE ui.username = %s);
        """

        with psycopg2.connect(**self.db_config) as conn:
            with conn.cursor() as cur:
                cur.execute(ACC_DET_SQL, (username,))
                result = cur.fetchone()

                if not result:
                    raise HTTPException(404, f"Account details for {username} not found")
                
                # get headers and zip them with the data we fetched (tuple)
                column_names = [desc[0] for desc in cur.description]
                for desc in cur.description:
                    print(desc)
                return dict(zip(column_names, result))
                

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
    return manager.get_details(username=username)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)