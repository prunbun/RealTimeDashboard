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

<br>
redis optim

- create base redis client, producer, consumer, and runner class
- now to run components, from the rootdirectory, we run for example, `python -m backend_servers.real_time_quote_server`
- 
