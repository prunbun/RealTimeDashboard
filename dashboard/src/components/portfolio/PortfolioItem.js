export function PortfolioItem({ positionData, index }) {
    const rowStyle = {
        backgroundColor: index % 2 !== 0 ? '#f9f9f9' : '#ffffff', // alternating colors
    };
    return positionData ? (
    <tr style={rowStyle}>
        <td style={{ padding: '8px' }}>{positionData.ticker}</td>
        <td style={{ padding: '8px' }}>{positionData.qty}</td>
        <td style={{ padding: '8px' }}>
        ${positionData.cost_basis.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}
        </td>
        <td style={{ padding: '8px' }}>
        {positionData.percent_change < 0 ? (
            `(${Math.abs(positionData.percent_change).toFixed(2)}%)`
        ) : (
            `${Math.abs(positionData.percent_change).toFixed(2)}%`
        )}
        </td>
        <td style={{ padding: '8px' }}>
        {positionData.unreal_pnl < 0 ? (
            `($${Math.abs(positionData.unreal_pnl).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            })})`
        ) : (
            `$${positionData.unreal_pnl.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            })}`
        )}
        </td>
    </tr>
    ) : (
    <tr>
        <td colSpan="5">"Waiting for positional info..."</td>
    </tr>
    );
}