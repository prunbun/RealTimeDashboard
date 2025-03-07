import { useState, useEffect, useRef } from "react";
import { WatchListItem } from "./WatchListItem";

export function WatchList() {
    const [socket, setSocket] = useState(null);

    useEffect(() => {

        const socket = new WebSocket("ws://localhost:8000/quotes_ticker_stream");
        setSocket(socket)

        return () => {
            socket.close();
        }

    }, []);

    return (
        <div style={{ fontFamily: "Arial, sans-serif", textAlign: "center", marginTop: "50px" }}>
        <h1>WatchList</h1>
        <WatchListItem key={"AAPL"} watchlist_ticker={"AAPL"} watchlist_socket={socket}/>
        <WatchListItem key={"MSFT"} watchlist_ticker={"MSFT"} watchlist_socket={socket}/>
        <WatchListItem key={"GOOG"} watchlist_ticker={"GOOG"} watchlist_socket={socket}/>
        <WatchListItem key={"AMD"} watchlist_ticker={"AMD"} watchlist_socket={socket}/>
        <WatchListItem key={"NVDA"} watchlist_ticker={"NVDA"} watchlist_socket={socket}/>
        <WatchListItem key={"AMZN"} watchlist_ticker={"AMZN"} watchlist_socket={socket}/>
        </div>
    );

}