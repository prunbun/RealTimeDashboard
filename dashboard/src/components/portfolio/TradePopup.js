import { useState } from "react"
import { AVAILABLE_TICKERS } from "../../constants";

export function TradePopup({onSubmit, onClose}) {

    const [ticker, setTicker] = useState("")
    const [qty, setQty] = useState(0);
    const [side, setSide] = useState("");

    const submitForm = () => {
        // validate the ticker
        // try to cast the qty into a number
        // place the trade

        const ticker_input = ticker.toUpperCase().trim();
        if (!ticker_input || !AVAILABLE_TICKERS.has(ticker_input)) {
            return;
        }

        if (qty <= 0) {
            return;
        }

        if (side !== "BUY" && side !== "SELL") {
            return;
        }


        onSubmit(ticker, qty, side);
    }

    return (
        <div>
            <h1>Trade Portal</h1>
            Ticker: <input name="ticker_input" onChange={(event) => setTicker(event.target.value)}/>
            Qty: <input name="qty_input" type="number" onChange={(e) => setQty(Number(e.target.value))}/>
            <label key="BUY">
                <input name='side_input' type="radio" value="BUY" onChange={() => setSide("BUY")}/> BUY
            </label>
            <label key="SELL">
                <input name='side_input' type="radio" value="SELL" onChange={() => setSide("SELL")}/> SELL
            </label>
            <button onClick={() => submitForm()}>Place Trade</button>
            <button onClick={onClose}>Close</button>
        </div>
    )
}