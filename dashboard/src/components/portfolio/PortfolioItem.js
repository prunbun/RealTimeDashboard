export function PortfolioItem({userPositionInfo}) {
    return (
        userPositionInfo ? (
            <p>
                <strong>Ticker:</strong> {userPositionInfo.ticker} |  
                <strong> Qty:</strong> {userPositionInfo.qty} |  
                <strong> Cost Basis:</strong> ${userPositionInfo.cost_basis.toFixed(2)} |  
                <strong> % Change:</strong>
                {userPositionInfo.percent_change < 0 
                    ? ` (${Math.abs(userPositionInfo.percent_change.toFixed(2))})` 
                    : ` ${Math.abs(userPositionInfo.percent_change.toFixed(2))}`
                } |
                <strong> Unrealized P/L:</strong> 
                {userPositionInfo.unreal_pnl < 0 
                    ? ` ($${Math.abs(userPositionInfo.unreal_pnl).toFixed(2)})` 
                    : ` $${userPositionInfo.unreal_pnl.toFixed(2)}`
                }
            </p>
        ) : (
            <p>"Waiting for positional info..."</p>
        )
    );

}