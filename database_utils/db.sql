-- quotes real time db
CREATE TABLE IF NOT EXISTS quotes_time_series (
    quote_id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticker TEXT NOT NULL,
    bid_price REAL NOT NULL,
    bid_qty int NOT NULL,
    ask_price REAL NOT NULL,
    ask_qty int NOT NULL,
    ts TIMESTAMP NOT NULL
);

SET timezone = 'America/New_York'; 

-- 1 min continuous aggregates
CREATE MATERIALIZED VIEW quotes_minute_buckets
WITH (timescaledb.continuous) AS
SELECT ticker, time_bucket('1 minute', ts) AS bucket, ( first(bid_price, ts) + first(ask_price, ts) ) / 2 AS first_price
FROM quotes_time_series
WHERE bid_price > 0 AND ask_price > 0
GROUP BY ticker, bucket;

SELECT add_continuous_aggregate_policy('quotes_minute_buckets',
start_offset => INTERVAL '14 days',
end_offset => INTERVAL '1 minute',
schedule_interval => INTERVAL '2 minutes');

-- user info
CREATE TABLE IF NOT EXISTS user_info (
    id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_activated BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE
);

-- trading account info
CREATE TABLE IF NOT EXISTS trading_account_info (
    account_id SERIAL PRIMARY KEY,
    user_id int UNIQUE NOT NULL REFERENCES user_info(id) ON DELETE CASCADE,
    available_cash NUMERIC(15,4) NOT NULL DEFAULT 200000.00,
    net_liquidity NUMERIC(15,4) NOT NULL DEFAULT 200000.00,
    reset_balance NUMERIC(15,4) NOT NULL DEFAULT 200000.00,
    net_profit NUMERIC(15,4) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- user trades
CREATE TABLE IF NOT EXISTS user_positions (
    position_id SERIAL PRIMARY KEY,
    user_id int NOT NULL REFERENCES user_info(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    qty int NOT NULL DEFAULT 0,
    total_value NUMERIC(15,4) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_ticker_combo UNIQUE(user_id, ticker)
);

-- 
-- update timestamp trigger
--

-- step 1: create the function
CREATE OR REPLACE FUNCTION update_timestamp() -- function name, OR REPLACE means it overrides func with same name
RETURNS TRIGGER AS $$ -- indicates it should run automatically
BEGIN 
    NEW.updated_at = NOW(); -- NEW is a pointer to the row being updated
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; -- postgres procedural language

-- step 2: activate the trigger
CREATE TRIGGER update_user_positions_timestamp -- name of the trigger
BEFORE UPDATE ON user_positions -- when should it trigger
FOR EACH ROW EXECUTE FUNCTION update_timestamp(); -- what should it do


