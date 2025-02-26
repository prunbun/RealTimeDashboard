import React, { useEffect, useState } from "react";

export function App() {
    const [stockData, setStockData] = useState(null);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8000/ws");

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received data:", data); // Debugging log
            setStockData({ ...data }); // Ensure a new object is set
        };

        socket.onclose = () => {
            socket.close();
        }
        socket.onerror = (error) => console.error("WebSocket Error:", error);

        return () => socket.close();
    }, []);

    return (
        <div style={{ fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "50px" }}>
            <h1>Real-Time Stock Data</h1>
            {stockData ? (
                <p>
                    <strong>Ticker:</strong> {stockData.ticker} |  
                    <strong> Bid:</strong> ${stockData.bid_price} |  
                    <strong> Ask:</strong> ${stockData.ask_price}
                </p>
            ) : (
                <p>Loading stock data...</p>
            )}
        </div>
    );
}