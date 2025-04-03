import React, { PureComponent } from "react";
import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend} from 'recharts';
import { COLORS } from "../../constants";


export function AllocationPie({positions}) {

    const chartData = Object.keys(positions).map((ticker) => ({
        name: ticker,
        value: positions[ticker].total_value
    }));

    return (
        <PieChart width={500} height={500}> {/* this is just the container that renders components inside it */}
            <Pie 
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(2)}%`} // the percentage is provided by recharts automatically
            >
                {/* These 'cells' override the base pie chart elements with this list of elements */}
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="None"/>
                ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
        </PieChart>
    )

}