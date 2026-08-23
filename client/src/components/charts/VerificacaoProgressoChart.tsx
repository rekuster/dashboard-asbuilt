import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface ProgressoData {
    name: string;
    Realizado: number | null;
    Projetado: number | null;
    Meta?: number | null;
}

interface VerificacaoProgressoChartProps {
    data: ProgressoData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-lg">
                <p className="font-bold text-slate-800 text-xs mb-1.5">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-0.5">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs font-medium text-slate-600">
                            {entry.name === "Meta" ? "Meta Planejada" : entry.name}:
                        </span>
                        <span className="text-xs font-bold" style={{ color: entry.color }}>
                            {entry.value} salas
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function VerificacaoProgressoChart({ data }: VerificacaoProgressoChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Aguardando dados de verificação para desenhar a curva
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", color: "#64748b" }}
                />

                {/* Linha Planejada (Baseline) - Stecla Slate */}
                <Line
                    type="monotone"
                    name="Meta"
                    dataKey="Meta"
                    stroke="#6C6A6A"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls
                />

                {/* Linha Realizada (Histórico Sólido) - Stecla Wine Red */}
                <Line
                    type="monotone"
                    name="Realizado"
                    dataKey="Realizado"
                    stroke="#940707"
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: "#940707", strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                />

                {/* Linha de Projeção (Futuro Pontilhado) - Stecla Muted Red */}
                <Line
                    type="monotone"
                    name="Projetado"
                    dataKey="Projetado"
                    stroke="#DF8F8F"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3.5, fill: "#DF8F8F", strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
