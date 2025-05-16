import { useState, useEffect, useRef } from "react";
import { WatchListItem } from "./WatchListItem";
import { AVAILABLE_TICKERS } from "../../constants";
import styles from "../../style_modules/Watchlist.module.css"





export function WatchList({stockData}) {
    const [tickers, setTickers] = useState([]);
    const [newTickerInput, setNewTickerInput] = useState("");
    
    useEffect(() => {
        try {
            const stored_tickers = JSON.parse(localStorage.getItem('watchlist_tickers')) || [];
            setTickers(stored_tickers);
        } catch (error) {
            console.error("Error parsing data from localStorage:", error);
        }

    }, []);

    // func that adds a ticker
    const add_ticker = () => {
        // get a ticker from the user stored in newTickerInput
        // append that to the list
        if (newTickerInput && AVAILABLE_TICKERS.has(newTickerInput) && !tickers.includes(newTickerInput)) {
            updated_tickers = [...tickers, newTickerInput];
            localStorage.setItem('watchlist_tickers', JSON.stringify(updated_tickers));
            setTickers(updated_tickers);
            setNewTickerInput('')
        }
    };

    const remove_ticker = (ticker_to_del) => {
        const updated_tickers = tickers.filter((t) => t !== ticker_to_del);
        localStorage.setItem('watchlist_tickers', JSON.stringify(updated_tickers));
        setTickers(updated_tickers);
    }

    const handleInputChange = (event) => {
        setNewTickerInput(event.target.value.toUpperCase());
    };
    const enterKey = (event) => {
        if (event.key === 'Enter') {
            add_ticker();
            setNewTickerInput("")
        }
    };


    return (
        <div>
            <text className={styles.header}>Watchlist</text>
            <div key={'watchlist_header'} style={{display: 'flex', gap: '10px', paddingTop: '10px'}}>
                <input                     
                    type="text"
                    placeholder="Enter Ticker"
                    value={newTickerInput}
                    onChange={handleInputChange}
                    onKeyDown={enterKey} 
                />
                <button onClick={add_ticker}> Add Ticker </button> 
            </div>
            {
                tickers.length === 0 ? 
                (<text>Add tickers to see live data!</text>) :
                (
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '12%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Ticker</th>
                                <th style={{ width: '10%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Bid</th>
                                <th style={{ width: '10%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Ask</th>
                                <th style={{ width: '10%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>- 2σ</th>
                                <th style={{ width: '13%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>1 Min M.A.</th>
                                <th style={{ width: '10%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>+ 2σ</th>
                                <th style={{ width: '10%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Time</th>
                                <th style={{ width: '15%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickers.map((ticker_name) => (
                                <WatchListItem ticker_data={stockData[ticker_name] || null} removeTicker = {remove_ticker} />
                            ))}
                        </tbody>
                    </table>
                )
            }
        
        </div>
    );

}