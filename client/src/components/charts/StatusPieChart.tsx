import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusPieChartProps {
    data: { status: string; count: number; color: string }[];
    onStatusClick?: (status: string, color: string) => void;
}

export default function StatusPieChart({ data }: StatusPieChartProps) {
    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle className="text-lg">Distribuição de Status das Salas</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="status"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            onClick={(data) => onStatusClick?.(data.status, data.color)}
                            style={{ cursor: 'pointer' }}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                            }}
                            formatter={(value: number, name: string) => {
                                const total = data.reduce((acc, curr) => acc + curr.count, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${value} (${percentage}%)`, name];
                            }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            formatter={(value, entry: any) => {
                                const total = data.reduce((acc, curr) => acc + curr.count, 0);
                                const item = data.find(d => d.status === value);
                                const percentage = total > 0 && item ? ((item.count / total) * 100).toFixed(0) : 0;
                                return `${value} (${percentage}%)`;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
