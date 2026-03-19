import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

interface ProgressoData {
    name: string;
    Realizado: number | null;
    Projetado: number | null;
}

interface VerificacaoProgressoChartProps {
    data: ProgressoData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                <p className="font-bold text-slate-700 text-xs mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm font-medium text-slate-600">
                            {entry.name}:
                        </span>
                        <span className="text-sm font-bold" style={{ color: entry.color }}>
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
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Aguardando dados de verificação para desenhar a curva
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                />
                
                {/* Linha Realizada (Histórico Sólido) */}
                <Line
                    type="monotone"
                    dataKey="Realizado"
                    stroke="#e11d48"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#e11d48", strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                />
                
                {/* Linha de Projeção (Futuro Pontilhado) */}
                <Line
                    type="monotone"
                    dataKey="Projetado"
                    stroke="#fda4af"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: "#fda4af", strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
