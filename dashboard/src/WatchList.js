import { useState, useEffect, useRef } from "react";
import { WatchListItem } from "./WatchListItem";

export function WatchList({stockData}) {
    const AVAILABLE_TICKERS = new Set(['AAPL', 'AMZN', 'MSFT', 'NFLX', 'GOOG', 'DDOG', 'NVDA', 'AMD']);
    const [tickers, setTickers] = useState([]);
    
    useEffect(() => {
        try {
            const stored_tickers = JSON.parse(localStorage.getItem('watchlist_tickers')) || [];
            setTickers(stored_tickers);
        } catch (error) {
            console.error("Error parsing data from localStorage:", error);
        }

    }, []);

    // func that adds a ticker
    const add_ticker = () => {
        // get a ticker from the user
        const new_ticker = prompt("type ticker name...")?.toUpperCase(); // ? means optional param

        // append that to the list
        if (new_ticker && AVAILABLE_TICKERS.has(new_ticker) && !tickers.includes(new_ticker)) {
            updated_tickers = [...tickers, new_ticker];
            localStorage.setItem('watchlist_tickers', JSON.stringify(updated_tickers));
            setTickers(updated_tickers);
        }
    };

    const remove_ticker = (ticker_to_del) => {
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