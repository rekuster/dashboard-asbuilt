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
        default: "border-slate-200",
        blue: "border-blue-200 bg-blue-50/50",
        green: "border-emerald-200 bg-emerald-50/50",
        red: "border-red-200 bg-red-50/50",
        orange: "border-amber-200 bg-amber-50/50",
    };

    const iconColors = {
        default: "text-muted-foreground",
        blue: "text-blue-600",
        green: "text-emerald-600",
        red: "text-red-600",
        orange: "text-amber-600",
    };

    const valueColors = {
        default: "text-foreground",
        blue: "text-blue-700",
        green: "text-emerald-700",
        red: "text-red-700",
        orange: "text-amber-700",
    };

    const badgeVariants = {
        default: "bg-slate-100 text-slate-600",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-rose-100 text-rose-700",
        info: "bg-blue-100 text-blue-700",
    };

    return (
        <Card className={`hover:shadow-md transition-shadow ${variants[variant]} ${className || ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {Icon && <Icon className={`h-4 w-4 ${iconColors[variant]}`} />}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className={`text-2xl font-bold ${valueColors[variant]}`}>{value}</div>
                    {badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${badgeVariants[badge.variant || 'default']}`}>
                            {badge.text}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <div className="text-xs text-muted-foreground">{subtitle}</div>
                    {trend && (
                        <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '+' : '-'}{trend.value}%
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
