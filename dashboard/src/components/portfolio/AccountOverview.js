import { useState, useEffect } from "react";
export function AccountOverview({accountData, positions, stockData}) {

    const [netLiquidity, setNetLiquidity] = useState(0);

    useEffect(() => {
        let liquidity = 0;

        if (accountData && positions && stockData) {

            for (const ticker in positions) {
                const {qty, total_value, cached_price_data} = positions[ticker] || {}; // safely allows access of values in case positions[ticker] is 'falsy' (like undef, null, etc.)
                if (!qty || !cached_price_data) continue;

                const price_data = stockData[ticker] ?? cached_price_data;
                if (!price_data) continue;

                if (qty > 0) {  // we have to sell here, so we use bid price
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
            <h1>Account Overview</h1>
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