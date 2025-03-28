import { useState, useEffect } from "react";
import styles from "../../style_modules/AccountOverview.module.css"

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
                <div className={styles.header}>Account Overview</div>
                <div> <span className={styles.value_name}>Account ID</span>| {accountData.account_id} </div>
                <div> <span className={styles.value_name}>Net Liquidity</span>| ${netLiquidity.toFixed(2)} </div>
                <div> <span className={styles.value_name}>Available Cash</span>| ${accountData.available_cash.toFixed(2)} </div>
                <div> <span className={styles.value_name}>Net Profit</span>| ${accountData.net_profit.toFixed(2)} </div>
            </div>
        ) : (
            <p>Loading account details...</p>
        )
    )
}