import { useState, useEffect, useRef } from "react";
import { TradePopup } from "./TradePopup";

export function AccountOverview({accountData}) {

    return (
        accountData ? (
            <div>
            <p> <strong>Account ID: </strong>{accountData.account_id} </p>
            <p> <strong>Net Liquidity: </strong>${accountData.net_liquidity.toFixed(2)} </p>
            <p> <strong>Available Cash: </strong>${accountData.available_cash.toFixed(2)} </p>
            <p> <strong>Net Profit: </strong>${accountData.net_profit.toFixed(2)} </p>
            </div>
        ) : (
            <p>Loading account details...</p>
        )
    )
}

export function Portfolio({stockData}) {
    const USERNAME = "honeykiwi"

    const [accountData, setAccountData] = useState(null);
    const [tradePopupOpen, setTradePopupOpen] = useState(false);

    const fetchAccountData = () => {
        fetch(`http://localhost:8001/account/${USERNAME}`)
        .then((res) => (res.json()))
        .then((res) => {
            console.log(res);
            setAccountData(res);
        })
        .catch((res) => console.log(res))   
    }

    useEffect(() => {
        fetchAccountData();
    },[])

    const resetAccount = () => {
        fetch(`http://localhost:8001/reset/${USERNAME}`)
        .then(response => response.json())
        .then(response => console.log(response))
        .then(() => fetchAccountData())
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
        .then(() => fetchAccountData())
        .catch(error => console.error("Trade error:", error))
    }


    return (
        <div>
            <AccountOverview accountData={accountData} />
            <button onClick={() => resetAccount()}>RESET ACCOUNT</button>
            <button onClick={() => setTradePopupOpen(true)}>TRADE</button>
            {tradePopupOpen && (<TradePopup onSubmit={placeTrade} onClose={() => setTradePopupOpen(false)}/>)}
        </div>
    )
}