import { useState, useEffect, useRef } from "react"

// NOTE, we are getting params as an object, which we must unpack using the object positional args
export function WatchListItem({ticker_data}) {

    return (
        ticker_data ? (
            <p>
                <strong>Ticker:</strong> {ticker_data.ticker} |  
                <strong> Bid:</strong> ${ticker_data.bid_price.toFixed(2)} |  
                <strong> Ask:</strong> ${ticker_data.ask_price.toFixed(2)} |  
                <strong> Timestamp:</strong> {ticker_data.timestamp}
            </p>
        ) : (
            <p>"Waiting for updates..."</p>
        )
    );

}