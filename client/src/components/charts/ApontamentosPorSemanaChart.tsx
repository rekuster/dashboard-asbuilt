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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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
            <LineChart data={data} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                    dataKey="semana"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickFormatter={(value) => value.split('-W')[1] ? `S.${value.split('-W')[1]}` : value}
                    axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} />
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
                    wrapperStyle={{ paddingTop: '10px' }}
                />

                {/* Appointments Line */}
                <Line
                    name="Apontamentos"
                    type="monotone"
                    dataKey="count"
                    stroke="#940707"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#940707", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, fill: "#940707", strokeWidth: 0 }}
                    label={{
                        position: 'top',
                        fontSize: 10,
                        fill: '#940707',
                        fontWeight: 'bold',
                        offset: 8
                    }}
                />

                {/* Verified Rooms Line */}
                <Line
                    name="Salas Verificadas"
                    type="monotone"
                    dataKey="verifiedRooms"
                    stroke="#10B981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#10B981", strokeWidth: 0 }}
                    label={{
                        position: 'bottom',
                        fontSize: 10,
                        fill: '#10B981',
                        fontWeight: 'bold',
                        offset: 8
                    }}
                />
            </LineChart>
        </ResponsiveContainer>
    );

    if (hideTitle) return chartContent;

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                    <TrendingUp className="w-5 h-5" />
                    Cronograma de Evolução
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartContent}
            </CardContent>
        </Card>
    );
}
