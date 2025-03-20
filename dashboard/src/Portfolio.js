import { useState, useEffect, useRef } from "react";


export function Portfolio() {
    const [accountData, setAccountData] = useState(null);

    useEffect(() => {

        const USERNAME = "honeykiwi"

        fetch(`http://localhost:8001/account/${USERNAME}`)
        .then((res) => (res.json()))
        .then((res) => {
            console.log(res);
            setAccountData(res);
        })
        .catch((res) => console.log(res))   

    },[])


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