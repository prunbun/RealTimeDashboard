# A Real-Time Trading Dashboard 

## Contents
- [Introduction](./README.md#introduction)
- [System Design](./README.md#system-design)
- [Part 1: Market Data](./README.md#market-data)
- [Part 2: Stream Handling](./README.md#stream-handling)
- [Part 3: Database Tables](./README.md#database-tables)
- [Part 4: Backend Servers](./README.md#backend-servers)
- [Part 5: Dashboard](./README.md#dashboard)
- [Tradeoffs and Future Items](./README.md#tradeoffs-and-future-items)

## Introduction
In this project, I explore how to build a real-time data streaming pipeline featuring a dashboard with a watchlist, P/L tracking, a trading gateway, and a historical prices chart. The code implements the data flow end-to-end, starting from receiving market data from the IEX exchange to displaying it dynamically on a dashboard with real-time updates. In the following sections, we break down the overall system design followed by deep-dives into each component and insights drawn from the implemention process. Lastly, we will recap the tradeoffs this project made as well as future extensions that are possible.

![](RealTimeDashboardExample.png)
![](HistoricalDashboardExample.png)

## System Design

In this section, we discuss the system design at a high level. Note that this stack mainly uses Postgres SQL, Python, and React

The table below describes the stack and function of each component, further details regarding the design are discussed in each respective section.

| Component           | Specification            | Description                                                                                     |
|---------------------|--------------------------|-------------------------------------------------------------------------------------------------|
| Data Ingestor       | Alpaca API               | Creates a connection with the exchange through the broker middleman and streams live prices     |
| Backend Servers     | Redis Pub/Sub, Fast API  | Receives the streamed data into the backend ecosytem and delivers data to subscribed components |
| Database            | Postgres, SQL, TimeScale | Stores application state including user account info and time-bucketed market prices            |
| Dashboard           | React, Websockets        | Displays data in a meaningful way for a trader, including a watchlist, P/L tracking, and metrics|

## Market Data

### Brokerage Background Info
Typically, software cannot directly access exchanges; instead, brokers like Alpaca act as the middleman and provide access to market data through an API. This can be thought of as the 'data source' in a real-time data pipeline and could very well also be sensor data etc. in other fields and applications. In this case (through the free account), the IEX exchange provides several pieces of information regarding instrument prices including: historical bars (open, high, low, close), quotes (bid, ask, volume, status), and trades. For the purposes of this project, we use the historical bars (for historical price charts) and quotes streaming (for real-time data).

### Websockets Explained
In a naive approach, an application might want to keep checking the current stock price every `X` number of seconds in a process called 'polling'. But polling can be inefficient for several reasons, including wasting time, flooding the server with too many requests, and limiting the application data input rate to the worst-case polling increment. Instead, real-time applications would much rather use an 'event-driven' architecture. This can be done in three ways:

1. WebHooks: Client gives the server a public endpoint saying 'Whenever your event data is ready, send a message to this endpoint!'
   1. These are good for a lot of async applications, uni-directional, and with clients that are okay to expose a public endpoint
2. WebSockets: Establish a long-running *bi-directional* TCP connection through an `UPGRADE` message
   1. Pros: low-latency, reduced HTTP overhead, in which the client can also send messages to the server to modify server state
   2. Cons: connections need to be re-established if the client ever disconnects and its hard to manage a lot of active websocket connections at scale
3. HTTP Streaming: Client sends a request to the server, which responds with an infinitely long response
   1. Typically uni-directional and data arrives in chunks
 
### Streaming in the Project
In this use-case, WebSockets was offered by the Alpaca API, but to communicate between the backend server and dashboard, WebSockets were also used there to allow the dashboard to (potentially) subscribe and unsubscribe to certain tickers. Note that when establishing a WebSocket connection with Alpaca, all tickers that you want to listen to need to be specified in advance and provided an async message handler; so in this case, because I had only a few tickers I was tracking, I chose to fetch all data at once and have the dashboard only selectively show data based on user preferences.

#### WebSockets for Data Ingestion

```python
# cache the data by ticker (key) and publish on all channels (topics)
async def store_and_publish(self, key: str, data_dict, channels: list[RedisChannel], keyspace:str = 'ticker'):
    self.redis_client.set(f"{keyspace}:{key}", json.dumps(data_dict))
    
    for channel in channels:
        self.redis_client.publish(channel.value, json.dumps(data_dict))

# establish the connection
self.alpaca_client = StockDataStream(ALPACA_API_KEY, ALPACA_SECRET_KEY, raw_data=True)
self.alpaca_client.subscribe_quotes(self.quote_data_handler, *(tickers)) 
self.alpaca_client.run()

# preprocess the received data and send it to the producer component that will notifiy all listeners
await self.redis_client.store_and_publish(key=data['S'], data_dict=quote_dict, channels=[RedisChannel.QUOTE_UPDATES])
```

#### WebSockets for Dashboard Updates
```javascript
// establish the connection with server
socket.current = new WebSocket("ws://localhost:8000/ws");
const socket_obj = socket.current;

// message handling
const handle_message = (message) => {
    const data = JSON.parse(message.data); // we get a message object, from which we need message.data

    setStockData( (prevData) => {
        const updated_data = {...prevData, [data.ticker]: {...data, timestamp: formatTime(data.timestamp)}};
        localStorage.setItem('watchlist_stock_data', JSON.stringify(updated_data));
        return updated_data;
    });
};

// add the event listener
socket_obj.addEventListener("message", handle_message);
```

## Stream Handling
Raw data arrives in string format rapidly and it requires several layers of processing before it is viable to use for any application built on top of the stream. 

### Rate Limiters (Leaky Bucket)
The first major challenge is putting a limit on the amount of messages our backend can process within a certain time-interval. In particular, we would like to rate-limit two quantities:
1. The total number of messages we process (through the `aiolimiter` python module)
2. The number of messages per ticker (to provide an equitable amount per symbol)

> The second is required because it quickly became apparent that the WebSocket stream most likely used a queue-like structure for updates and sent individual ticker market prices in bursts. This is not ideal for our application as we want all prices to update at equal rates and thus we explore the Leaky Bucket Algorithm in detail (can find implementation in `market_data_ingestors/quote_ingestor.py`). 

</br>
Below we see the specification of the Leaky Bucket Algorithm.

> NOTE: To fully grasp how the concurrent nature of this algorithm works, it is helpful to have programming experience with locks, channels, and the python asyncio library.

#### async def leak(leak_rate)
At its core, the algorithm depends on a queue, which will 'leak' at a fixed interval specified by the `leak rate`. As messages come in, they are enqueued and as they leak, they are published to the appropriate channel through the Redis Pub/Sub channels.

#### async def accept(message)
This method enqueues the message into the message queue accessed by `leak()`, but we can't always queue all of the messages we get, else, the queue will become very long since we are maintaining a strict limit for how fast the queue can 'leak' per ticker. Thus, we will only accept messages if the length of the queue is less than some threshold, else we drop the message.

#### async def refresh()
This is where the magic occurs! We could set the threshold used in the `accept()` method to be fixed, however, that wouldn't respect the burst nature of the incoming stream. Instead, we can make this threshold dynamic! When the length of the queue is under some `IDLE_CAPACITY`, the longer it stays there, the more likely a burst is incoming. To accomodate this, at a `refresh_rate` we increase the accept threshold indefinitely until the burst arrives. When the burst finally arrives, we can accomodate up to the new accept threshold. At this point, the queue is likely much longer than the `IDLE_CAPACITY`, and `refresh()` does nothing here. Instead, whenever, `leak()` triggers, it sets the threshold to be `max(current_threshold - 1, IDLE_CAPACITY)`, this way, if the threshold is currently high due to burst, it will accommodate and slowly shrink it, otherwise, it will make sure it is at least at the `IDLE_CAPACITY` when in 'normal' mode.

### Topic Listeners
The second major challenge is being able to deliver messages on an event-driven basis to all the components of the system. Redis Pub/Sub is one such method! Essentially, there are message topics that producers can publish to and listeners can subscribe to. When a message is sent to the topic, all listeners are notified at once! This way, each time we `leak()` a message for a particular ticker, we will push it to the `QUOTES_UPDATES` topic and all data pipelines that depend on quotes data will be notified.

</br>

Each listener to these topics must implement their own form of event-driven logic. The magic happens using the Python `asyncio` package and the keywords `await` and `yield`. Essentially, the consumer will run an infinite loop in which they wait to run logic until a message arrives and when that data arrives, the main loop unblocks. But we don't want the program to hang when this function is called just waiting for a message, we want it to give up control to the Python main thread to execute other functions while we wait. Here, we have a helper function spawn a thread and `await` the message from the topic and subsequently `yield` it; while we await, the main Python thread is free to work on other tasks (requests in the case of a server)!

### Data Cleaning

As with any timeseries data, we will need to clean it from the raw format and produce a dict consumable by any applications. In this case, the data is eventually cleaned to be in this format:

```python
quote_dict = {
    'ticker': data['S'], 
    'bid_price': data['bp'], 
    'bid_qty': data['bs'],
    'ask_price': data['ap'],
    'ask_qty': data['as'], 
    'timestamp': str(data['t'].to_datetime())
}
```

## Database Tables

There are 4 core tables the dashboard uses; the schemas are fairly straightforward and queries used for setup are included in `database_utils/db.sql`. Below, I provide some notes on interesting design choices.

### Time Series Data

`quotes_time_series` is the core table here. Essentially for each (ticker, timestamp) combo, it generates a unique id and stores it along with other info, such as those found in the `quote_dict` above. Few things to note here:

- Postgres actually supports the timestamp data-type which is very useful for timeseries data
- Because of the large scale of data, I put an expiration date of 1 week, which query I could run to clean out the database manually at a later time
- The data was also aggregated into smaller batches on the server side as it consumed from the stream and inserted periodically for efficiency; the tradeoff was that the batches themselves were in memory and would be lost if the server was halted abruptly, but the batches were fairly small.
- A separate MATERIALIZED VIEW, `quotes_minute_buckets` was also created using Timescale DB continuous aggregates to help make the data more usable for calculations; the granularity set was 1 minute buckets 

### Account and Trade Data

Here, there are 3 core tables:

1. `user_info`: Contains information regarding a unique user id and login information. This is a possible route for future work, learning how to make secure accounts. 
2. `trading_account_info`: Core trading account diagnostic info such as available cash, P/L, and liquidity. The trading gateway directly interacts with this table for updating the results of placed trades and risk monitoring.
3. `user_positions`: Info regarding the user's nonzero holdings. As trades are placed and the user either opens or closes positions, this table is updated and referenced for dashboard metrics. 

> NOTES
> 
> In the user_info table, a user id must be unique, password hashes are also stored with salts. Currently, there is only one testing user, `honeykiwi`.
> 
> For the trading account, because it is a paper trading account, it can be reset. It doesn't fully connect with the exchange, but it would be a very simple extension to simply forward the trades entered into user_positions to the Alpaca client along with generated API keys from their website.
> 
> The `user_positions` table enforces a CONSTRAINT that each data record must have a unique (user_id, ticker) combination to avoid any bookkeeping issues.

## Backend Servers

These servers perform a variety of roles, primarily being the 'bridge' between the dashboard 'client' and data stores populated by the stream-handling components. Below, I highlight some of the core functionalities. Importantly, some servers accept WebSocket connections for streaming, while others rely on basic REST requests for one-time tasks.

### Real-Time Quote Server `backend_servers/real_time_quote_server.py`
Recall that there were standardized stream consumers that were described in the `Stream Handling: Topic Listeners` section. Now, it is really easy to leverage this abstraction by simply passing in a function pointer for a `message_handler` argument that is called inside the infinite stream-processing loop. This server receives the data from the `QUOTES_UPDATES` channel and does data checking / sorting and forwards the data to registered listeners. It also computes several risk metrics including moving averages. The most interesting is how the server establishes the WebSocket connection; note that these are client-initiated and thus (besides any server errors or maintenance) the server is expected to maintain the connection until the client decides to disconnect.

```python
@app.websocket("/ws")
async def subscribe_stock_data(websocket: WebSocket):
    await websocket.accept()
    runner.connect(websocket)

    try:
        while True:
            await asyncio.sleep(1000)
    except WebSocketDisconnect:
        runner.disconnect(websocket)
```

### Trading Gateway: `backend_servers/trading_gateway_server,py`
Rather than accepting WebSocket connections, this server is more of the common REST request handler type. Here, you will find classic access patterns like taking in parameters from the request and using format strings to create dynamic SQL queries into the database and returning a dict that will be delivered to the client. Two notable patterns are below.

#### Database Access Pattern (Postgres)
```python
try:
    with psycopg2.connect(**self.db_config) as conn:
        with conn.cursor() as cur:
            cur.execute(SQL_QUERY, (args,))
            cur.execute(SQL_QUERY_2, (args,))

            conn.commit()
            return {'message': "Action performed successfully!"}
        
except Exception as e:
    print(e)
    return {'message': "Error performing action..."}
```

#### Trading Logic
I choose to implement the logic assuming an average cost basis over the course of the position and execute liquidating orders at the market prices from the Redis cache. My system doesn't support limit orders yet, and is a possible future extension. The simple flow is listed below:

1. Extract necessary info from the trade request
2. Either open a new position or calculate the new position
   1. Liquidate any open position using old vs. market cost basis if needed
   2. If the position becomes larger, update cost basis of trades
3. Update trading account info and record trades in the respective tables
4. Return receipt of trade (or error) to the client

## Dashboard

The final component is the dashboard itself. It is built in React, which helps greatly to re-render only the components that have state changes. This is very helpful as when new data comes in, the entire page doesn't continuously reload repeatedly but rather has fast updates, perfect for a real-time dashboard. The dashboard itself has a few main features which are highlighted below. Please note that a full view of the dashboard is provided in the `.png` images in the introduction and also included in the root directory of the project. Traders use a combination of real-time, historical, and analytical data to make trading decisions and this dashboard aims to replicate what a trader might use day-to-day.

### Watchlist
This is a classic component in any trading dashboard. This is updated in real-time with bid and ask prices as well as moving average bands. Remember that the Leaky Bucket algorithm allows for equitable updates between all the listed tickers and their respective timestamps are also displayed for the latest updates. Generally, a separate risk engine would be running for each ticker per client in a more complex system.

### Account Overview
Lists critical account information like the cash balance, current portfolio holdings, and a trading gateway portal that will execute trades at the best available market prices. One of the coolest features here is the unrealized P/L metric which allows one to see the value of their portfolio components according to current market prices before placing trades!

### Historical Pricing Chart
This component leverages the `backend_servers/historical_bars_server.py` to query historical prices through the Alpaca API. Data can be displayed by `Ticker`, `Time Interval` (range of data), and the `Bucket Interval` (aggregated bucket size for prices). The chart itself is built through the ReCharts package which has great animations for new charts and smoothly renders huge amounts of data points, even the daily chart over a year! It comes with a nice tooltip to view the data from Alpaca including the Open (O), High (H), Low (L), Close (C) bars per bucket interval within the range.

## Tradeoffs and Future Items
In this section, I detail additional notes on tradeoffs and possible extensions to each component of this project.

### Market Data

**Tradeoffs:** 

- Equitable Leaky Bucket: Better distribution, more latency
- Free-tier Broker: Not using most popular exchanges, data is likely not ultra-low latency
- Redis Pub/Sub over alternatives: very simple to setup, but it is in-memory key-value store
</br>

**Extensions:** 

- Incorporating more tickers and instruments
- Leveraging time-buckets to do additional analysis using Pandas or window functions
- Splitting up clients into individual sectors of tickers to avoid cluttering a single stream

### Backend

**Tradeoffs:** 
- Single websocket connection for all tickers: simplifies logic significantly but pushes filtering responsibility onto client, can be poor performance on edge devices (there is a subscribe/unsubscribe refactor I tried to make, little bit hard to get right)
- Impressive modularization using the RedisClient base class with the async message handler

</br>

**Extensions:** 

- Risk Engine: My proposed algorithm for an example metric (VaR) is below!

> Example Value at Risk (VaR) risk calculation algorithm
> 1. Risk engine has queues for every ticker the user currently has a position in
> 2. At init, queries latest 60 minute-bars, calculates returns/differentials using pandas and also stores the latest price, calculates worst 5% return and sends snapshot of all percentages to the client in the web socket stream
> 3. Subscribe to minute-bars from the exchange and every time a new price comes in for something in our portfolio, recalculate, so T * nlogn op for n = 60 ; T = num_unique_tickers_in_portfolio, if len(queue) > 60, popleft the queue before calculating so we have the latest window, update latest price
> 4. Each time the user places a trade in the trading gateway, refresh the position, if it has disappeared, free the queue, if we are trading a new one, do step 2 for the newest ticker, else, do nothing (since client calculates the final VaR value)
> 
> - tradeoff might be having a global risk engine vs. an individual one per client, tradeoff is doing repeated work and refetching each time a client connects, extra logic
> - upside of customized risk engine is faster updates bc less tickers, more granular control over hyperparameters like window, bucket size, percentiles, and method of calculations

### Database

**Tradeoffs:** 

- Stores price data and all user positions: fairly efficient, although estimating storage size and data retention policies must be done carefully to allow for scaling 

</br>

**Extensions:** 

- Add capability for user logins and cookies
- Offer end-to-end trading capability with Alpaca API paper trading (or a full brokerage account!) and use the database state to build out a full trading application (very ambitious, but useful extension!)
- Look into database security with different 'admins' having access to only certain tables and assigning only certain admin credentials to server files (like AWS IAM roles)

### Dashboard

**Tradeoffs:** 

- Recalculating unrealized PnL on the fly: slows down client but unfeasible for backend to calculate for every price update per client
- Recharts vs. D3.js vs. ApexCharts: Recharts are great to work with for React-based dashboards, my usecase did not need very complicated, custom charts, although I would have preferred to be able to have a candlestick chart (I tried building one, but it is difficult)
- Streamlit vs. React Dashboard: Streamlit is very useful, I wanted to practice React in this project

</br>

**Extensions:** 

- Risk Metrics: VaR, Maximum Drawdown, Entry/Exit indicators
- Charting: Moving average and real-time updating charting, volume bars, risk metrics indicators
- Limit Orders: Offering users to place real trades and executing them at a certain price and displaying trade history

