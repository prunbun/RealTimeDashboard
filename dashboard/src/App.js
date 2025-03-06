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
// import { useState, useEffect, useRef } from "react";

// export function App() {
//     const [stockData, setStockData] = useState(null);
//     const [subscribed, setSubscribed] = useState(false);
//     const socketRef = useRef(null);

//     useEffect(() => {
//         const socket = new WebSocket("ws://localhost:8000/ws");
//         socketRef.current = socket;

//         socket.onmessage = (event) => {
//             const data = JSON.parse(event.data);
//             console.log("Received data:", data);

//             // Only update if it's AAPL data
//             if (data.ticker === "AAPL") {
//                 setStockData({ ...data, timestamp: new Date().toLocaleTimeString() });
//             }
//         };

//         socket.onclose = () => console.log("WebSocket closed");
//         socket.onerror = (error) => console.error("WebSocket Error:", error);

//         return () => socket.close();
//     }, []);

//     const handleSubscribe = () => {
//         if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//             socketRef.current.send(JSON.stringify({ action: "subscribe", ticker: "AAPL" }));
//             setSubscribed(true);
//         }
//     };

//     const handleUnsubscribe = () => {
//         if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//             socketRef.current.send(JSON.stringify({ action: "unsubscribe", ticker: "AAPL" }));
//             setSubscribed(false);
//             setStockData(null); // Clear data when unsubscribing
//         }
//     };

//     return (
//         <div style={{ fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "50px" }}>
//             <h1>Real-Time Stock Data</h1>
            
//             <button onClick={handleSubscribe} disabled={subscribed} style={{ marginRight: "10px" }}>
//                 Subscribe to AAPL
//             </button>
//             <button onClick={handleUnsubscribe} disabled={!subscribed}>
//                 Unsubscribe
//             </button>

//             {stockData ? (
//                 <p>
//                     <strong>Ticker:</strong> {stockData.ticker} |  
//                     <strong> Bid:</strong> ${stockData.bid_price} |  
//                     <strong> Ask:</strong> ${stockData.ask_price} |  
//                     <strong> Timestamp:</strong> {stockData.timestamp}
//                 </p>
//             ) : (
//                 <p>{subscribed ? "Waiting for AAPL updates..." : "Not subscribed"}</p>
//             )}
//         </div>
//     );
// }