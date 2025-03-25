import { useState, useEffect } from "react";
import { PortfolioItem } from "./PortfolioItem";

export function CurrentPositions({accountData, positions, stockData}) {

    const [positionInfo, setPositionInfo] = useState({});
    const [tickerKeys, setTickerKeys] = useState([]);

    useEffect(() => {

        if (accountData && positions && stockData) {

            let newPositionInfo = {}

            for (const ticker in positions) {
                const {qty, total_value, cached_price_data} = positions[ticker] || {}; // safely allows access of values in case positions[ticker] is 'falsy' (like undef, null, etc.)
                if (!qty || !total_value || !cached_price_data) continue;

                const price_data = stockData[ticker] ?? cached_price_data;
                if (!price_data) continue;

                let current_price = price_data.bid_price;
                if (qty < 0) {
                    current_price = price_data.ask_price;
                }

                const TICKER = ticker;
                const QTY = qty;
                const COST_BASIS = total_value / Math.abs(qty);
                const PERCENT_CHANGE = ((current_price - COST_BASIS) / COST_BASIS) * 100;
                const UNREALIZED_PNL = qty * (current_price - COST_BASIS) // the negative qty will flip the difference

                newPositionInfo[TICKER] = {
                    'ticker': TICKER, 
                    'qty': QTY, 'cost_basis': COST_BASIS, 
                    'percent_change': PERCENT_CHANGE, 
                    'unreal_pnl': UNREALIZED_PNL
                }
            }

            setPositionInfo(newPositionInfo);
            setTickerKeys(Object.keys(positionInfo).sort());
        }

    }, [accountData, positions, stockData]);

    

    return (
        <div>
            <h1>Current Positions</h1>
            {tickerKeys.length > 0 ? 
                (
                    tickerKeys.map((key) => {
                        return <PortfolioItem key={key} userPositionInfo={positionInfo[key]} />
                    })
                )
                :
                (
                    <p>No user positons!</p>
                )

            }
        </div>
    )
}