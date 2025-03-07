import { useState, useEffect, useRef } from "react"

// NOTE, we are getting params as an object, which we must unpack using the object positional args
export function WatchListItem({watchlist_ticker, watchlist_socket}) {
    const [stockData, setStockData] = useState(null);

    useEffect(() => {

        if (!watchlist_socket) {
            return;
        }

        const onOpen = () => {
            watchlist_socket.send(JSON.stringify({ action: "subscribe", ticker: watchlist_ticker}));
        }

        const handleMessage = (message) => {
            const data = JSON.parse(message.data); // we get a message object, from which we need message.data
            if (data.ticker == watchlist_ticker) {
                setStockData({...data, timestamp: new Date().toISOString()});
            }
        };

        const onclose = () => {
            watchlist_socket.send(JSON.stringify({ action: "unsubscribe", ticker: watchlist_ticker}));
        }
        
        watchlist_socket.addEventListener("open", onOpen);
        watchlist_socket.addEventListener("message", handleMessage);
        watchlist_socket.addEventListener("close", onclose);

        

        return () => {
            // when we disconnect, we tell the server and socket, that this component isn't listening
            watchlist_socket.removeEventListener("message", handleMessage);
        }
        
    }, [watchlist_ticker, watchlist_socket]);

    return (
        stockData ? (
            <p>
                <strong>Ticker:</strong> {stockData.ticker} |  
                <strong> Bid:</strong> ${stockData.bid_price.toFixed(2)} |  
                <strong> Ask:</strong> ${stockData.ask_price.toFixed(2)} |  
                <strong> Timestamp:</strong> {stockData.timestamp}
            </p>
        ) : (
            <p>"Waiting for updates..."</p>
        )
    );


}