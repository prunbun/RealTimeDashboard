import { useState, useEffect, useRef } from "react"

// NOTE, we are getting params as an object, which we must unpack using the object positional args
export function WatchListItem({ticker_data, removeTicker}) {
    return (
        ticker_data ? (
            <tr key={ticker_data.ticker}>
                <td style={{ padding: '8px' }}>{ticker_data.ticker}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.bid_price ? `${ticker_data.bid_price.toFixed(2)}` : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.ask_price ? `${ticker_data.ask_price.toFixed(2)}` : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.window_stats?.lower_band_2_sigma ? ticker_data.window_stats.lower_band_2_sigma.toFixed(2) : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.window_stats?.one_min_ma ? ticker_data.window_stats.one_min_ma.toFixed(2) : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.window_stats?.higher_band_2_sigma ? ticker_data.window_stats.higher_band_2_sigma.toFixed(2) : 'N/A'}</td>
                <td style={{ padding: '8px' }}>{ticker_data?.timestamp || 'N/A'}</td>
                <td style={{ padding: '8px' }}>
                    <button onClick={() => removeTicker(ticker_data.ticker)}>remove</button>
                </td>
            </tr>
        )
    : (
        <p>"Waiting for updates..."</p>
    )
    );

}