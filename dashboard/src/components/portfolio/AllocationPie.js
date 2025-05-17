import React, { PureComponent } from "react";
import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend} from 'recharts';
import { COLORS } from "../../constants";


export function AllocationPie({positions}) {

    const chartData = Object.keys(positions).map((ticker) => ({
        name: ticker,
        value: positions[ticker].total_value
    }));

    return (
        <div style={{ width: 300, height: 300 }}> {/* needed for flex layout */}
            <ResponsiveContainer aspect={0.65}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="30%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="None" />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );

}