import { useState, useEffect, useRef, useMemo } from "react";
import { TradePopup } from "./TradePopup";
import { USERNAME } from "../../App";
import { AccountOverview } from "./AccountOverview";
import { CurrentPositions } from "./CurrentPositions";

export function Portfolio({stockData}) {

    const [accountData, setAccountData] = useState(null);
    const [tradePopupOpen, setTradePopupOpen] = useState(false);
    const [positions, setPositions] = useState({})

    const fetchAccountData = () => {
        fetch(`http://localhost:8001/account/${USERNAME}`)
        .then((res) => (res.json()))
        .then((res) => {
            console.log(res);
            setAccountData(res);
        })
        .catch((res) => console.log(res))   
    }

    const fetchPositions = () => {
        fetch(`http://localhost:8001/positions/${USERNAME}`)
        .then((res) => res.json())
        .then((res) => {
            console.log("fetched positions", res);
            setPositions(res)
        })
        .catch((res) => console.log(res))
    }

    useEffect(() => {
        fetchAccountData();
        fetchPositions();
    },[])

    const resetAccount = () => {
        fetch(`http://localhost:8001/reset/${USERNAME}`)
        .then(response => response.json())
        .then(response => console.log(response))
        .then(() => {
            fetchAccountData();
            fetchPositions();
        })
        .catch(error => console.log(error))
    }

    const placeTrade = (ticker, qty, operation) => {
        const orderDetails = {
            username: USERNAME,
            ticker: ticker,
            qty: qty,
            op: operation
        }

        fetch('http://localhost:8001/trade', {
            method: "POST",
            headers: {
                "Content-Type": "application/JSON"
            },
            body: JSON.stringify(orderDetails)
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Error while making the request: ${response.status}`);
            }

            return response.json();
        })
        .then(response => console.log("Trade response:", response))
        .then(() => {
            fetchAccountData();
            fetchPositions();
        })
        .catch(error => console.error("Trade error:", error))
    }


    return (
        <div>
            <AccountOverview accountData={accountData} positions={positions} stockData={stockData} />
            <CurrentPositions accountData={accountData} positions={positions} stockData={stockData} />
            <button onClick={() => resetAccount()}>RESET ACCOUNT</button>
            <button onClick={() => setTradePopupOpen(true)}>TRADE</button>
            {tradePopupOpen && (<TradePopup onSubmit={placeTrade} onClose={() => setTradePopupOpen(false)}/>)}
            
        </div>
    )
}