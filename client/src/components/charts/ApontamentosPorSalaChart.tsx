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

interface ApontamentosPorSalaChartProps {
    data: { sala: string; count: number }[];
}

const COLORS = ["#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ApontamentosPorSalaChart({ data }: ApontamentosPorSalaChartProps) {
    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle className="text-lg">Apontamentos por Sala (Top 10)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="sala"
                            type="category"
                            width={100}
                            tick={{ fontSize: 12 }}
                            interval={0}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
