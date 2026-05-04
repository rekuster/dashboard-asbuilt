import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle: React.ReactNode;
    icon?: LucideIcon;
    trend?: {
        value: number | string;
        isPositive: boolean;
    };
    badge?: {
        text: string;
        variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    };
    variant?: 'default' | 'blue' | 'green' | 'red' | 'orange';
    className?: string;
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, badge, variant = 'default', className }: KPICardProps) {
    const variants = {
        default: "bg-slate-50 border-slate-300 border-l-4",
        blue: "bg-blue-50/50 border-blue-500 border-l-4",
        green: "bg-emerald-50/50 border-emerald-500 border-l-4",
        red: "bg-rose-50/50 border-rose-500 border-l-4",
        orange: "bg-amber-50/50 border-amber-500 border-l-4",
    };

    const titleColors = {
        default: "text-slate-500",
        blue: "text-blue-700",
        green: "text-emerald-700",
        red: "text-rose-700",
        orange: "text-amber-700",
    };

    const badgeVariants = {
        default: "bg-slate-200 text-slate-700",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-rose-100 text-rose-700",
        info: "bg-blue-100 text-blue-700",
    };

    return (
        <Card className={`border-none shadow-sm rounded-xl p-4 transition-all hover:shadow-md ${variants[variant]} ${className || ''}`}>
            <div className="flex items-center justify-between mb-1">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${titleColors[variant]}`}>{title}</p>
                {Icon && <Icon className={`h-3.5 w-3.5 opacity-30`} />}
            </div>
            
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{value}</span>
                {badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${badgeVariants[badge.variant || 'default']}`}>
                        {badge.text}
                    </span>
                )}
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
                <div className="text-[11px] font-medium text-slate-500">{subtitle}</div>
                {trend && (
                    <span className={`text-[10px] font-bold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.isPositive ? '+' : '-'}{trend.value}%
                    </span>
                )}
            </div>
        </Card>
    );
}
