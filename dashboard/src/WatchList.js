import { useState, useEffect, useRef } from "react";
import { WatchListItem } from "./WatchListItem";

export function WatchList() {
    const AVAILABLE_TICKERS = new Set(['AAPL', 'AMZN', 'MSFT', 'NFLX', 'GOOG', 'DDOG', 'NVDA', 'AMD']);

    const socket = useRef(null)
    const [tickers, setTickers] = useState([]);
    const [stockData, setStockData] = useState({});
    
    useEffect(() => {

        // establish the connection
        socket.current = new WebSocket("ws://localhost:8000/quotes_ticker_stream");
        const socket_obj = socket.current;

        // message handling
        const handle_message = (message) => {
            const data = JSON.parse(message.data); // we get a message object, from which we need message.data

            setStockData( (prevData) => {
                const updated_data = {...prevData, [data.ticker]: {...data, timestamp: new Date(data.timestamp).toISOString()}};
                localStorage.setItem('watchlist_stock_data', JSON.stringify(updated_data));
                return updated_data;
            });

        };
        socket_obj.addEventListener("message", handle_message);

        socket_obj.addEventListener("open", () => {
            // restablish stored state (if any)
            try {
                const stored_tickers = JSON.parse(localStorage.getItem('watchlist_tickers')) || [];
                setTickers(stored_tickers);

                const stored_stock_data = JSON.parse(localStorage.getItem('watchlist_stock_data')) || {};
                setStockData(stored_stock_data);

                if (stored_tickers.length > 0) {
                    stored_tickers.forEach(ticker_name => {
                        if (socket.current.readyState === WebSocket.OPEN) {
                            console.log(ticker_name);
                            socket.current.send(JSON.stringify({ action: "subscribe", ticker: ticker_name}));
                        }
                    });
                }

            } catch (error) {
                console.error("Error parsing data from localStorage:", error);
            }
        })

        return () => {
            socket_obj.removeEventListener("message", handle_message);
            socket_obj.close();
        }

    }, []);

    // func that adds a ticker
    const add_ticker = () => {
        // get a ticker from the user
        const new_ticker = prompt("type ticker name...")?.toUpperCase(); // ? means optional param

        // append that to the list
        if (new_ticker && AVAILABLE_TICKERS.has(new_ticker) && !tickers.includes(new_ticker)) {
            if (socket.current.readyState === WebSocket.OPEN) {
                socket.current.send(JSON.stringify({ action: "subscribe", ticker: new_ticker}));
            }
            updated_tickers = [...tickers, new_ticker];
            localStorage.setItem('watchlist_tickers', JSON.stringify(updated_tickers));
            setTickers(updated_tickers);
        }
    };

    const remove_ticker = (ticker_to_del) => {
        if (socket.current.readyState == WebSocket.OPEN) {
            socket.current.send(JSON.stringify({ action: "unsubscribe", ticker: ticker_to_del}));
        }
        const updated_tickers = tickers.filter((t) => t !== ticker_to_del);
        localStorage.setItem('watchlist_tickers', JSON.stringify(updated_tickers));
        setTickers(updated_tickers);
    }

    return (
        <div style={{ fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "50px" }}>
            <h1>WatchList</h1>
            <button onClick={add_ticker}> Add Ticker </button> 
            {
                tickers.length == 0 ?
                (<p>Add tickers to see live data!</p>) :
                (
                    tickers.map((ticker_name) => (
                        <div key={ticker_name} style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                            <WatchListItem ticker_data={stockData[ticker_name] || null} />
                            <button onClick={() => {remove_ticker(ticker_name)}}>x</button>
                        </div>
                    ))
                )
            }
        
        </div>
    );

}