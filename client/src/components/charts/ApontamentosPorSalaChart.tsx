import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

interface ApontamentosPorSalaChartProps {
    data: { sala: string; count: number }[];
}

const COLORS = [
    "#940707",
    "#6C6A6A",
    "#940707",
    "#6C6A6A",
    "#A78F8F",
    "#6C6A6A",
    "#940707",
    "#CCCBCB",
];

export default function ApontamentosPorSalaChart({ data }: ApontamentosPorSalaChartProps) {
    return (
        <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center gap-2">
                <Layers className="w-4 h-4 text-[#940707]" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Apontamentos por Sala (Top 10)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="sala"
                            type="category"
                            width={110}
                            tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                            interval={0}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#FFFFFF",
                                borderColor: "#E2E8F0",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
