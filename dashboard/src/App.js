import { useState, useEffect, useRef } from "react";
import { WatchList } from "./WatchList";
import { Portfolio } from "./Portfolio";
import chipmunk from "./images/chipmunk.jpg";

export const AVAILABLE_TICKERS = new Set(['AAPL', 'AMZN', 'MSFT', 'NFLX', 'GOOG', 'DDOG', 'NVDA', 'AMD']);

export function App() {

    const socket = useRef(null)
    const [stockData, setStockData] = useState({});
    
    useEffect(() => {

        // establish the connection
        socket.current = new WebSocket("ws://localhost:8000/ws");
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
                const stored_stock_data = JSON.parse(localStorage.getItem('watchlist_stock_data')) || {};
                setStockData(stored_stock_data);

            } catch (error) {
                console.error("Error parsing data from localStorage:", error);
            }
        })

        return () => {
            socket_obj.removeEventListener("message", handle_message);
            socket_obj.close();
        }

    }, []);


    return (
        <div style={{ fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "50px" }}>
            <img src={chipmunk} alt="company logo" style={{ width: '400px', height: 'auto' }} />
            <h1>Real-Time Stock Data</h1>
            <WatchList stockData={stockData} />
            <h1>Trading Simulator</h1> 
            <Portfolio stockData={stockData} />
        </div>
    );
}