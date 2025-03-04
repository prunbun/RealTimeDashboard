import psycopg2
from config import load_config

def create_quotes_tables():

    commands = (
        """
        CREATE TABLE IF NOT EXISTS quotes_time_series (
            quote_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            ticker VARCHAR(10) NOT NULL,
            bid_price REAL NOT NULL,
            bid_qty int NOT NULL,
            ask_price REAL NOT NULL,
            ask_qty int NOT NULL,
            ts TIMESTAMPTZ NOT NULL
        )
        """,
        """
        SET timezone = 'America/New_York';
        """
    )

    try:
        config = load_config()
        
        with psycopg2.connect(**config) as conn:
            with conn.cursor() as cur:
                for command in commands:
                    cur.execute(command)
                    
    except (psycopg2.DatabaseError, Exception) as error:
        print(error)

    return

if __name__ == "__main__":
    create_quotes_tables()