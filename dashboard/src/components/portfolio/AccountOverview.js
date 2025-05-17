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
                <div className={styles.overview_stats_row}>
                    <div className={styles.numeric_stat_box}>
                        <div className={styles.stat_box_header}>NET LIQUIDITY</div>
                        <div>$ {netLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className={styles.numeric_stat_box}>
                        <div className={styles.stat_box_header}>AVAILABLE CASH</div>
                        <div>$ {accountData.available_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className={styles.numeric_stat_box}>
                        <div className={styles.stat_box_header}>NET PROFIT</div>
                        <div>$ {accountData.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>
            </div>
        ) : (
            <p>Loading account details...</p>
        )
    )
}