import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    LineChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";

interface ApontamentosPorSemanaChartProps {
    data: { semana: string; count: number; verifiedRooms?: number }[];
    hideTitle?: boolean;
}

export default function ApontamentosPorSemanaChart({ data, hideTitle }: ApontamentosPorSemanaChartProps) {
    if (!data || data.length === 0) {
        const emptyState = (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <TrendingUp className="w-8 h-8 opacity-20" />
                <p className="text-sm italic font-medium">Sem dados históricos acumulados</p>
            </div>
        );
        if (hideTitle) return <div className="h-full border border-dashed border-slate-200 rounded-xl bg-slate-50/50">{emptyState}</div>;
        return (
            <Card className="h-[400px]">
                <CardHeader><CardTitle className="text-lg">Tendência por Semana</CardTitle></CardHeader>
                <CardContent className="h-[300px]">{emptyState}</CardContent>
            </Card>
        );
    }

    const chartContent = (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 25, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                    dataKey="semana"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickFormatter={(value) => value.split('-W')[1] ? `S.${value.split('-W')[1]}` : value}
                    axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} width={30} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '15px' }}
                    formatter={(value) => {
                        const colorClass = value === "Apontamentos" ? "text-[#940707]" : "text-[#22c55e]";
                        return <span className={`text-[12px] font-bold ${colorClass} mr-4`}>{value}</span>;
                    }}
                />
                <Line
                    name="Apontamentos"
                    type="monotone"
                    dataKey="count"
                    stroke="#940707"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#940707", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#940707", strokeWidth: 0 }}
                    label={{ position: 'top', fontSize: 11, fontWeight: 'bold', fill: "#940707", offset: 10 }}
                />
                <Line
                    name="Salas Verificadas"
                    type="monotone"
                    dataKey="verifiedRooms"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#22c55e", strokeWidth: 0 }}
                    label={{ position: 'top', fontSize: 11, fontWeight: 'bold', fill: "#22c55e", offset: 10 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );

    if (hideTitle) return chartContent;

    return (
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-5 h-[400px]">
            <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-[#940707]" strokeWidth={2.5} />
                <h2 className="text-[11px] font-black text-[#545F66] uppercase tracking-widest">
                    Apontamentos por Semana
                </h2>
            </div>
            <div className="h-[320px] pt-4">
                {chartContent}
            </div>
        </Card>
    );
}
