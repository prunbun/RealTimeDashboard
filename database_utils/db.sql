CREATE TABLE IF NOT EXISTS quotes_time_series (
    quote_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    bid_price REAL NOT NULL,
    bid_qty int NOT NULL,
    ask_price REAL NOT NULL,
    ask_qty int NOT NULL,
    ts TIMESTAMP NOT NULL
);

SET timezone = 'America/New_York'; 