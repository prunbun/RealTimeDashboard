import { useState, useEffect } from "react";
import { PortfolioItem } from "./PortfolioItem";
import styles from '../../style_modules/Portfolio.module.css'

export function CurrentPositions({accountData, positions, stockData}) {

    const [positionInfo, setPositionInfo] = useState({});
    const [tickerKeys, setTickerKeys] = useState([]);

    useEffect(() => {
        if (accountData && positions) {

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
            setTickerKeys(Object.keys(newPositionInfo).sort()); // notice that this is async, so we need to use newPositionInfo here, NOT positionInfo since it is not guaranteed to be set
        }

    }, [accountData, positions, stockData]);

    

  return (
    <div style={{width: 500}}>
      {tickerKeys.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '15%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}> Ticker</th>
              <th style={{ width: '15%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}> Qty</th>
              <th style={{ width: '20%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}> Basis</th>
              <th style={{ width: '20%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}> % Change</th>
              <th style={{ width: '30%', borderBottom: '1px solid #ccc', padding: '8px', textAlign: 'left' }}> Unrealized P/L</th>
              {/* Add more headers if needed */}
            </tr>
          </thead>
          <tbody>
            {tickerKeys.map((key, index) => (
              <PortfolioItem key={key} positionData={positionInfo[key]} index = {index} />
            ))}
          </tbody>
        </table>
      ) : (
        <p>No user positions!</p>
      )}
    </div>
  );
}