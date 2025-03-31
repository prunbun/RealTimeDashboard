import React from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  ErrorBar,
  ComposedChart,
  Line,
  Cell,
  Rectangle
} from "recharts";

const mockData = [
  { date: "2024-03-25", open: 100, close: 110, high: 115, low: 98 },
  { date: "2024-03-26", open: 110, close: 108, high: 112, low: 105 },
  { date: "2024-03-27", open: 108, close: 115, high: 118, low: 107 },
  { date: "2024-03-28", open: 115, close: 113, high: 116, low: 112 },
];

const transformData = (data) => {
  return data.map((point) => ({
    date: point.date,
    low: Math.min(point.close, point.open),
    high: Math.max(point.close, point.open),
    height: Math.abs(point.close - point.open),
    upper_wick_midpoint: (point.high + Math.max(point.close, point.open)) / 2,
    lower_wick_midpoint: (point.low + Math.min(point.close, point.open)) / 2,
    bull_upper_wick_half_length: point.close > point.open ? (point.high - Math.max(point.close, point.open)) / 2 : null,
    bull_lower_wick_half_length: point.close > point.open ? (Math.min(point.close, point.open) - point.low) / 2 : null,
    bear_upper_wick_half_length: point.close <= point.open ? (point.high - Math.max(point.close, point.open)) / 2 : null,
    bear_lower_wick_half_length: point.close <= point.open ? (Math.min(point.close, point.open) - point.low) / 2 : null,
    up: point.close > point.open,
  }));
};

export function CandlestickChart({ data = mockData, width = 600, height = 400, colorUp = "#00c517", colorDown = "#c5005f", barWidth = 10, lineWidth = 3 }) {
  const transformedData = transformData(data);
  return (
    <ResponsiveContainer width={width} height={height}>
      <ComposedChart data={transformedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />

        <Bar dataKey="low" fillOpacity={0} stackId="stack" />
        <Bar dataKey="height" stackId="stack" barSize={barWidth}>
          {transformedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.up ? colorUp : colorDown} />
          ))}
        </Bar>

        {/* These are the error bars for when the stock closes lower than it opens */}
        <Line dataKey="upper_wick_midpoint" stroke="none" isAnimationActive={false} dot={false}>
          <ErrorBar dataKey="bear_upper_wick_half_length" width={0} strokeWidth={lineWidth} stroke={colorDown} />
        </Line>
        <Line dataKey="lower_wick_midpoint" stroke="none" isAnimationActive={false} dot={false}>
          <ErrorBar dataKey="bear_lower_wick_half_length" width={0} strokeWidth={lineWidth} stroke={colorDown} />
        </Line>

        {/* These are the error bars for when the stock closes higher than it opens */}
        <Line dataKey="upper_wick_midpoint" stroke="none" isAnimationActive={false} dot={false}>
          <ErrorBar dataKey="bull_upper_wick_half_length" width={0} strokeWidth={lineWidth} stroke={colorUp} />
        </Line>
        <Line dataKey="lower_wick_midpoint" stroke="none" isAnimationActive={false} dot={false}>
          <ErrorBar dataKey="bull_lower_wick_half_length" width={0} strokeWidth={lineWidth} stroke={colorUp} />
        </Line>

      </ComposedChart>
    </ResponsiveContainer>
  );
};
