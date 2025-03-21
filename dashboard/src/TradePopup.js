

export function TradePopup({onSubmit, onClose}) {
    return (
        <div>
            <h1>Trade Portal</h1>
            <button onClick={() => onSubmit("MSFT", 10, "BUY")}>Buy 10 of MSFT</button>
            <button onClick={() => onSubmit("GOOG", 10, "SELL")}>Sell 10 of MSFT</button>
            <button onClick={onClose}>Close</button>
        </div>
    )
}