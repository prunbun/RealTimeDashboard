import React, { useState, useEffect, PureComponent } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from '../../style_modules/HistoricalChart.module.css'

import { AVAILABLE_TICKERS, TimeInterval, BucketInterval, BUCKET_OPTIONS } from "../../constants";
const CHART_TICKERS = [...AVAILABLE_TICKERS]

export function HistoricalPricesChart() {

    const [chartData, setChartData] = useState([]);
    const [yDomain, setYDomain] = useState([0, 1000]);
    const [lineStrokeColor, setLineStrokeColor] = useState('red');

    const [ticker, setTicker] = useState(null)
    const [timeframe, setTimeFrame] = useState(null);
    const [bucket, setBucket] = useState(null);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);

        if (bucket === "MINUTE" || timeframe === TimeInterval.ONE_DAY) {
            return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date); // "14:30"
        }
    
        switch (timeframe) {
            case TimeInterval.FIVE_DAYS:
            case TimeInterval.ONE_MONTH:
                return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date);
            case TimeInterval.SIX_MONTHS:
            case TimeInterval.ONE_YEAR:
                return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
            case TimeInterval.FIVE_YEARS:
                return new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(date);
            default:
                return date.toISOString();
        }
    };

    const calculateTicks = (data, numTicks = 5) => {
        if (data.length <= numTicks) return data.map(d => d.timestamp); // Use all points if few exist
    
        const SKIP_INTERVAL = Math.floor(data.length / (numTicks - 1));
        return data.filter((_, index) => index % SKIP_INTERVAL === 0).map(d => d.timestamp);
    };
    
    useEffect(() => {

        if (!ticker || !timeframe || !bucket || ticker === "") {
            return;
        }

        const candlestick_data_params = {
            ticker: ticker,
            timeframe: timeframe,
            bucket_interval: bucket
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
            if (res.candlesticks) {
                const num_candlesticks = res.candlesticks.length;
                const formatted_data = res.candlesticks.map((candle, index, array) => {
                    return {
                        timestamp: formatDate(candle.timestamp),
                        readable_timestamp: new Intl.DateTimeFormat("en-US", {
                            month: "short",   // 3-letter month
                            day: "2-digit",   // 2-digit day 
                            year: "numeric",  // 4-digit year
                            hour: "2-digit",  // 2-digit hour
                            minute: "2-digit",// 2-digit minute
                            hour12: true      // Use 24-hour time (HH:MM)
                        }).format(new Date(candle.timestamp)),
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
                const minLow = Math.min(...scaling_data);
                const maxHigh = Math.max(...scaling_data);

                // Add a buffer
                const padding = 10
                const PADDING_PERCENTAGE = 0.02
                const yDomain = [Math.floor(minLow - minLow * PADDING_PERCENTAGE), Math.ceil(maxHigh + maxHigh * PADDING_PERCENTAGE)];

                if (formatted_data[0].close < formatted_data[num_candlesticks - 1].close) {
                    setLineStrokeColor('green')
                } else {
                    setLineStrokeColor('red')
                }

                setYDomain(yDomain);
                setChartData(formatted_data);
            }
            
        })
        .catch((res) => console.error(res))


    }, [ticker, timeframe, bucket])

    const CustomizedDot = (props) => {
        const { cx, cy, height, dataKey, stroke, payload, value } = props;
        
        return (
            <circle cx={cx} cy={cy} r={2} fill={lineStrokeColor} stroke={lineStrokeColor} strokeWidth={1} />
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const { ticker, open, high, low, close, volume, readable_timestamp } = payload[0].payload; // Get data from the payload
    
            return (
                <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', borderRadius: '5px' }}>
                    <div style={{display:"flex", flexDirection:"column"}}>
                        <span style={{marginBottom:"10px"}}>{readable_timestamp}</span>
                        <span>Open: ${open.toFixed(2)}</span>
                        <span>High: ${high.toFixed(2)}</span>
                        <span>Low: ${low.toFixed(2)}</span>
                        <span>Close: ${close.toFixed(2)}</span>
                        <span>Volume: {volume}</span>
                    </div>
                </div>
            );
        }
        return null;
    };


    return (
        <div className={styles.historical_chart}>
            <div className={styles.header}>Historical Price Chart</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 50}}>
                <div style={{display: 'flex', gap: 15}}>
                    <label style={{fontWeight: 'bold', color: "#686868", fontSize: 15}}>Ticker: </label>
                    <select value={ticker} onChange={(ticker_input) => setTicker(ticker_input.target.value)}>
                        <option value="">--</option> 
                        {CHART_TICKERS.map(choice => <option key={choice} value={choice}>{choice}</option>)}
                    </select>
                </div>

                <div>
                    <label style={{fontWeight: 'bold', color: "#686868", fontSize: 15}}>Time Interval: </label>
                    {
                        Object.values(TimeInterval).map((interval) => (
                            <label key={interval} style={{marginRight:"10px"}}>
                                <input 
                                    type="radio"
                                    value={interval}
                                    checked={timeframe === interval}
                                    onChange={() => {
                                        setTimeFrame(interval);
                                        setBucket(BUCKET_OPTIONS[interval][0]);
                                    }}
                                />
                                {interval}
                            </label>
                        ))
                    }
                </div>

                <div>
                    <label style={{fontWeight: 'bold', color: "#686868", fontSize: 15}} >Bucket Interval: </label>
                    <select value={bucket} onChange={(bucket_input) => setBucket(bucket_input.target.value)}>
                        {(BUCKET_OPTIONS[timeframe] || []).map((bucket_option => (
                            <option key={bucket_option} value={bucket_option}>{bucket_option}</option>
                        )))}

                    </select>
                </div>


            </div>
            <div style={{height:300, width:800}}>
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
                        <XAxis dataKey="timestamp" minTickGap={10} ticks={calculateTicks(chartData, 5)} padding={{ left: 10, right: 10 }} />
                        <YAxis domain={yDomain}/>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="linear" dataKey="close" stroke={lineStrokeColor} dot={<CustomizedDot />}/>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}