import { useState, useEffect, useRef } from "react"
import styles from "../../style_modules/Watchlist.module.css"

// NOTE, we are getting params as an object, which we must unpack using the object positional args
export function WatchListItem({ticker_data, removeTicker, index}) {
    const rowStyle = {
        backgroundColor: index % 2 !== 0 ? '#f9f9f9' : '#ffffff', // alternating colors
    };

    return (
        ticker_data ? (
            <tr style={rowStyle} key={ticker_data.ticker}>
                <td style={{ padding: '8px' }}>{ticker_data.ticker}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.bid_price ? `${ticker_data.bid_price.toFixed(2)}` : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.ask_price ? `${ticker_data.ask_price.toFixed(2)}` : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.window_stats?.lower_band_2_sigma ? ticker_data.window_stats.lower_band_2_sigma.toFixed(2) : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.window_stats?.one_min_ma ? ticker_data.window_stats.one_min_ma.toFixed(2) : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.window_stats?.higher_band_2_sigma ? ticker_data.window_stats.higher_band_2_sigma.toFixed(2) : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.timestamp || 'N/A'}</td>
                <td style={{ padding: '8px' }}>
                    <button onClick={() => removeTicker(ticker_data.ticker)} className={styles.remove_button} style={rowStyle}>
                        x remove
                    </button>
                </td>
            </tr>
        )
    : (
        <p>"Waiting for updates..."</p>
    )
    );

}