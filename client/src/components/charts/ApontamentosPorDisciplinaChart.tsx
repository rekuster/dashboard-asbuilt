import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Info } from "lucide-react";

interface ApontamentosPorDisciplinaChartProps {
    data: { disciplina: string; count: number }[];
    hideTitle?: boolean;
}

const COLORS = [
    "#940707", // Stecla Red
    "#6C6A6A", // Stecla Dark Gray
    "#CCCBCB", // Stecla Light Gray
    "#940707", // Loop Red
    "#6C6A6A", // Loop Dark Gray
    "#CCCBCB", // Loop Light Gray
    "#A78F8F", // Muted Red/Gray
    "#475052", // Dark Slate
];

export default function ApontamentosPorDisciplinaChart({ data, hideTitle }: ApontamentosPorDisciplinaChartProps) {
    if (!data || data.length === 0) {
        const emptyState = (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Users className="w-8 h-8 opacity-20" />
                <p className="text-sm italic font-medium">Nenhum apontamento por disciplina</p>
            </div>
        );
        if (hideTitle) return <div className="h-full border border-dashed border-slate-200 rounded-xl bg-slate-50/50">{emptyState}</div>;
        return (
            <Card className="h-[320px] pt-4">
                <CardHeader><CardTitle className="text-lg">Distribuição por Disciplina</CardTitle></CardHeader>
                <CardContent className="h-[300px]">{emptyState}</CardContent>
            </Card>
        );
    }

    const chartContent = (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 30, bottom: 20 }}>
                <Pie
                    data={data}
                    cx="50%"
                    cy="55%"
                    outerRadius={75}
                    innerRadius={60}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="disciplina"
                    minAngle={15} // Ensure tiny slices are visible
                    label={({ name, percent }) => `${name || 'OUTROS'} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.5)" />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                />
                <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                    formatter={(value, entry: any) => {
                        const { payload } = entry;
                        const total = data.reduce((acc, item) => acc + item.count, 0);
                        const percent = total > 0 ? (payload.count / total * 100).toFixed(0) : 0;
                        const displayName = value && value.trim() ? value : "OUTROS";
                        return <span className="text-[10px] text-slate-600 font-bold uppercase">{displayName} ({percent}%)</span>;
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );

    if (hideTitle) return chartContent;

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Impacto por Disciplina
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartContent}
            </CardContent>
        </Card>
    );
}
