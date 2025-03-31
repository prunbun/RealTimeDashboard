import React, { useState, useEffect, PureComponent } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function HistoricalPricesChart() {

    const [chartData, setChartData] = useState([])
    const [yDomain, setYDomain] = useState([0, 1000])

    useEffect(() => {

        const formatDate = (timestamp) => {
            const date = new Date(timestamp);
            const formatter = new Intl.DateTimeFormat('en-US', {
                month: 'short', // 3 letter abbreviation for the month
                day: '2-digit', // Two-digit date
            });
            return formatter.format(date);
        };

        const candlestick_data_params = {
            ticker: 'GOOG',
            bucket_interval: 'DAY',
            timeframe: '1MONTH'
            
        }

        fetch('http://localhost:8002/historical', {
            method: "POST",
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(candlestick_data_params)
        })
        .then((res) => res.json()) // if we are missing this, we get a response object, not the actual json of the data
        .then((res) => {
            console.log(res);
            // setChartData(res['candlesticks'])
            if (res.candlesticks) {
                const formatted_data = res.candlesticks.map((candle) => {
                    return {
                        timestamp: formatDate(candle.timestamp),
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                        up: candle.close > candle.open
                    }
                })
                
                // Calculate minLow and maxHigh
                scaling_data = formatted_data.map(d => d.close)
                const minLow = Math.floor(Math.min(...scaling_data));
                const maxHigh = Math.ceil(Math.max(...scaling_data));

                // Add a buffer (5%)
                const padding = 10
                const yDomain = [minLow - padding, maxHigh + padding];

                setYDomain(yDomain);
                setChartData(formatted_data);
            }
            
        })
        .catch((res) => console.error(res))


    }, [])

    const CustomizedDot = (props) => {
        const { cx, cy, height, dataKey, stroke, payload, value } = props;
        
        return (
            <circle cx={cx} cy={cy} r={2} fill="red" stroke="red" strokeWidth={1} />
        );
        

    };


    return (
        <div style={{height:300, width:600}}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={yDomain}/>
                    <Tooltip />
                    <Legend />
                    <Line type="linear" dataKey="close" stroke="red" dot={<CustomizedDot />}/>
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}