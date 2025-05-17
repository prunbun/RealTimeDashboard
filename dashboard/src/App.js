import { useState, useEffect, useRef } from "react";
import { WatchList } from "./components/watchlist/WatchList";
import { Portfolio } from "./components/portfolio/Portfolio";
import { NavBar } from "./components/NavBar";
import { HistoricalPricesChart } from "./components/historical/HistoricalPricesChart";


import chipmunk from "./images/chipmunk.jpg";
import styles from "./style_modules/App.module.css"
import { Line } from "recharts";

const formatTime = (timestamp) => {
    if (!timestamp) {
        return 'N/A';
    }
    try {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error("Error formatting timestamp:", error);
        return 'Invalid Time';
    }
};

export function App() {

    const socket = useRef(null)
    const [stockData, setStockData] = useState({});
    const [activeTab, setActiveTab] = useState('realtime');

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
    };
    
    useEffect(() => {

        // establish the connection
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
            <div style={{display: 'flex', justifyContent: 'center'}}>
                <div
                    className={activeTab === 'realtime' ? styles.active_tab : styles.inactive_tab}
                    onClick={() => handleTabClick('realtime')}
                >
                    Real Time
                </div>
                <div
                    className={activeTab === 'historical' ? styles.active_tab : styles.inactive_tab}
                    onClick={() => handleTabClick('historical')}
                >
                    Historical
                </div>
            </div>
            <div className={styles.main1}>
                {activeTab === 'realtime' && (
                    <>
                        <div className={styles.watchlist}>
                            <WatchList stockData={stockData} />
                        </div>
                        <div className={styles.account_overview}>
                            <Portfolio stockData={stockData} />
                        </div>
                    </>
                )}
                {activeTab === 'historical' && (<HistoricalPricesChart />)}
            </div>

        </div>
    );
}