import { useState } from "react"
import { AVAILABLE_TICKERS } from "../../constants";
import styles from '../../style_modules/Portfolio.module.css'

export function TradePopup({onSubmit, onReset}) {

    const [ticker, setTicker] = useState("")
    const [qty, setQty] = useState(0);
    const [side, setSide] = useState("");
    const [newTickerInput, setNewTickerInput] = useState("");
    const [newQtyInput, setNewQtyInput] = useState("");

    const submitForm = () => {
        // validate the ticker
        // try to cast the qty into a number
        // place the trade

        const ticker_input = newTickerInput.toUpperCase().trim();
        if (!ticker_input || !AVAILABLE_TICKERS.has(ticker_input)) {
            return;
        }

        if (newQtyInput <= 0) {
            return;
        }

        if (side !== "BUY" && side !== "SELL") {
            return;
        }


        onSubmit(ticker_input, newQtyInput, side);
        setNewTickerInput('')
        setNewQtyInput(0)
    }

    const handleTickerInputChange = (event) => {
        setNewTickerInput(event.target.value.toUpperCase());
    };
    const handleQtyInputChange = (event) => {
        setNewQtyInput(Number(event.target.value));
    };

    return (
        <div className={styles.trading_gateway_box}>
            <div className={styles.current_positions_header}>
            TRADING GATEWAY
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <div style={{display: 'flex', gap: '10px'}}>
                    <div style={{fontWeight: 'bold', color: "#686868", fontSize: 15}}>Ticker: </div>
                    <input 
                        name="ticker_input" 
                        onChange={handleTickerInputChange}
                        placeholder="Enter Ticker"
                        value={newTickerInput}
                    />
                    <div style={{fontWeight: 'bold', color: "#686868", fontSize: 15}}>Qty: </div>
                    <input 
                        name="qty_input" 
                        type="number" 
                        onChange={handleQtyInputChange}
                        value={newQtyInput}
                    />
                    <label key="BUY" className={styles.radio_option_text}>
                        <input name='side_input' type="radio" value="BUY" onChange={() => setSide("BUY")}/> Buy
                    </label>
                    <label key="SELL" className={styles.radio_option_text}>
                        <input name='side_input' type="radio" value="SELL" onChange={() => setSide("SELL")}/> Sell
                    </label>
                </div>
                <div style={{display: 'flex', gap: 20}}>
                    <button onClick={() => submitForm()} className={styles.trade_button}>
                        PLACE TRADE
                    </button>
                    <button onClick={() => onReset()} className={styles.reset_button}>
                        RESET ACCOUNT
                    </button>
                </div>
            </div>
        </div>
    )
}