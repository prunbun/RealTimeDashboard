import { useState, useEffect, useRef } from "react";
import { WatchList } from "./components/watchlist/WatchList";
import { Portfolio } from "./components/portfolio/Portfolio";
import { NavBar } from "./components/NavBar";
import { HistoricalPricesChart } from "./components/historical/HistoricalPricesChart";


import chipmunk from "./images/chipmunk.jpg";
import styles from "./style_modules/App.module.css"
import { Line } from "recharts";

export const AVAILABLE_TICKERS = new Set(['AAPL', 'AMZN', 'MSFT', 'NFLX', 'GOOG', 'DDOG', 'NVDA', 'AMD']);
export const USERNAME = "honeykiwi"
export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF4567', '#FF8042', '#A28DFF'];

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
        <div className={styles.app}>
            <NavBar />
            <div className={styles.main1}>
                <div className={styles.watchlist}>
                    <WatchList stockData={stockData} />
                </div>
                <div className={styles.account_overview}>
                    <Portfolio stockData={stockData} />
                </div>
            </div>

            <HistoricalPricesChart />
        </div>
    );
}