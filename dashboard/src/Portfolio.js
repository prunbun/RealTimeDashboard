import { useState, useEffect, useRef, useMemo } from "react";
import { TradePopup } from "./TradePopup";

export function AccountOverview({accountData, positions, stockData}) {

    const [netLiquidity, setNetLiquidity] = useState(0);

    useEffect(() => {
        let liquidity = 0;

        if (accountData !== null && positions !== null) {

            for (const ticker in positions) {
                const {qty, data} = positions[ticker] || {};
                const price_data = stockData?.[ticker] ?? data;

                if (qty > 0) {
                    // we have to sell here, so we use bid price
                    liquidity += qty * (price_data.bid_price)
                } else {
                    liquidity += qty * (price_data.ask_price)
                }
            }
        }

        setNetLiquidity(liquidity + accountData?.available_cash ?? 0);

    }, [accountData, positions, stockData]);

    return (
        accountData ? (
            <div>
            <p> <strong>Account ID: </strong>{accountData.account_id} </p>
            <p> <strong>Net Liquidity: </strong>${netLiquidity.toFixed(2)} </p>
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
            <button onClick={() => resetAccount()}>RESET ACCOUNT</button>
            <button onClick={() => setTradePopupOpen(true)}>TRADE</button>
            {tradePopupOpen && (<TradePopup onSubmit={placeTrade} onClose={() => setTradePopupOpen(false)}/>)}
        </div>
    )
}