# RealTimeDashboard

- pip3 install websocket
- pip install aiolimiter
- brew install postgresql@17
- brew install redis
- pip install redis asyncio
- brew install node
- npm install react react-dom
- npm install --save-dev parcel
- npm start
- pip freeze > requirements.txt (pretty cool for dependencies)

<br>
rate limiter with leaky bucket

<br>
redis-server

<br>
pip install "fastapi[standard]" - similar to node.js and flask, but has better data validation, using websocket for streaming

<br>
read more about parcel, redis, fastapi

<br>

- step 1 was to get a flow of prices from back to front for 1 stock
- step 2 is to get a flow of prices for 2 stocks

<br>

- need to add info about why we choose postgres and diff b/w postgres and sql, and why not choose timescale bc its not free (i think)
- brew services start postgresql@17 / brew services stop postgresql@17
- pip install psycopg2-binary (postgres adaptor for python)
- createuser -s postgres
- psql -U postgres
- "-#" means we are in a multiline statement, so we can use \q to get out of the psql console and restart
- change database.ini for postgres user details
- CREATE ROLE newuser WITH LOGIN PASSWORD 'password';
- GRANT ALL PRIVILEGES ON DATABASE your_database TO newuser;
- ALTER DATABASE quotes_time_series OWNER TO dashboard_admin;
- \dt is tables, \l is databases \du is users \d [table name] gives schema access, \dt+ shows tables and sizes
- maybe create a single database and have multiple tables so we can join based on ticker
- add sql to insert
- add sql to remove stale data from the ticker that we get last in the query for that batch, write batched updates
- want to prioritize fast inserts because we aren't going to necessarily be modifying or deleting rows

<br>
redis optim

- create base redis client, producer, consumer, and runner class
- now to run components, from the rootdirectory, we run for example, `python -m backend_servers.real_time_quote_server`

<br>

- react passes in props as an object
- for json, we need to get data using message.data
- NOTE: IT IS POSSIBLE FOR PRICE TO BE 0 IF THAT SIDE OF THE ORDER BOOK IS EMPTY
- ? means optional param
- having () in onclick means it executes when rendered, need ref, so without () for it to work properly
- const is not mutable in js
- react re-renders each component every time the list of tickers changes, meaning that it comes back to null or 'waiting for updates' until it resends the subscribe message
  - to fix this, we actually handle the subs, unsubs in the watchlist itself and only pass data to the watchlist component, that way, the data isn't touched for the rest of the tickers
- use localStorage with JSON.stringify and JSON.parse to restore watchlist data from the previous session, reconnect to all tickers and restore old data
  - and do this in onOpen so that we can send 'subscribe' messages only when the socket is actually open, ALSO, note that react state is not updated immediately so do the reconnections from the localstorage directly

<br>

- brew tap timescale/tap
- brew install timescaledb libpq
- psql -U postgres -d market_data -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
- alter table quotes_time_series drop constraint quotes_time_series_pkey;
- alter table quotes_time_series add primary key (quote_id, ts)
- SELECT create_hypertable('quotes_time_series', 'ts', migrate_data => true);
- SELECT add_retention_policy('quotes_time_series', INTERVAL '90 days');
