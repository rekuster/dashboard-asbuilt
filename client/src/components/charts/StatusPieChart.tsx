import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface StatusPieChartProps {
    data: { status: string; count: number; color: string }[];
    onStatusClick?: (status: string, color: string) => void;
}

export default function StatusPieChart({ data, onStatusClick }: StatusPieChartProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#940707]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Status das Salas
                </h3>
            </div>
            <div className="p-4 flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="count"
                            nameKey="status"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            onClick={(data) => onStatusClick?.(data.status, data.color)}
                            style={{ cursor: "pointer" }}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#FFFFFF",
                                borderColor: "#E2E8F0",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                            formatter={(value: number, name: string) => {
                                const total = data.reduce((acc, curr) => acc + curr.count, 0);
                                const percentage =
                                    total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${value} (${percentage}%)`, name];
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => {
                                const total = data.reduce((acc, curr) => acc + curr.count, 0);
                                const item = data.find((d) => d.status === value);
                                const percentage =
                                    total > 0 && item
                                        ? ((item.count / total) * 100).toFixed(0)
                                        : 0;
                                return (
                                    <span className="text-[11px] font-semibold text-slate-600">
                                        {value} ({percentage}%)
                                    </span>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
