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
    "#475052", // Dark Slate
    "#8B939C", // Medium Gray
    "#9E2A2B", // Tertiary Red
    "#6C6A6A", // Stecla Dark Gray
    "#A78F8F", // Muted Red/Gray
    "#CCCBCB", // Stecla Light Gray
    "#545F66", // Cool Slate
    "#D9D9D9", // Silver Gray
    "#7F1D1D", // Dark Red
    "#334155", // Slate 700
];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill }: any) => {
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 18) * cos;
    const my = cy + (outerRadius + 18) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 10;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    
    const color = fill || "#475569";
    
    return (
        <g>
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={color} fill="none" strokeWidth={1.2} opacity={0.8} />
            <circle cx={ex} cy={ey} r={2.5} fill={color} stroke="#fff" strokeWidth={1} />
            <text 
                x={ex + (cos >= 0 ? 1 : -1) * 6} 
                y={ey} 
                dy={3} 
                textAnchor={textAnchor} 
                fill={color} 
                className="text-[9px] font-black uppercase tracking-wider"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {`${name} (${(percent * 100).toFixed(0)}%)`}
            </text>
        </g>
    );
};

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
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="disciplina"
                    minAngle={15}
                    label={renderCustomizedLabel}
                    labelLine={false}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.98)",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value: number, name: string) => {
                        const total = data.reduce((acc, curr) => acc + curr.count, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return [`${value} apontamentos (${percentage}%)`, name];
                    }}
                />
                <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    formatter={(value, entry: any) => {
                        const { payload } = entry;
                        const total = data.reduce((acc, item) => acc + item.count, 0);
                        const percent = total > 0 ? (payload.count / total * 100).toFixed(0) : 0;
                        const displayName = value && value.trim() ? value : "OUTROS";
                        return <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mr-2">{displayName} ({percent}%)</span>;
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );

    if (hideTitle) return chartContent;

    return (
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-5 h-[400px]">
            <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#940707]" strokeWidth={2.5} />
                <h2 className="text-[11px] font-black text-[#545F66] uppercase tracking-widest">
                    Apontamentos por Disciplina
                </h2>
            </div>
            <div className="h-[320px] pt-4">
                {chartContent}
            </div>
        </Card>
    );
}
