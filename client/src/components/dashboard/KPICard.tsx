import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon?: LucideIcon;
    trend?: {
        value: number | string;
        isPositive: boolean;
    };
    variant?: 'default' | 'blue' | 'green' | 'red' | 'orange';
    className?: string;
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'default', className }: KPICardProps) {
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

    return (
        <Card className={`hover:shadow-md transition-shadow ${variants[variant]} ${className || ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {Icon && <Icon className={`h-4 w-4 ${iconColors[variant]}`} />}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColors[variant]}`}>{value}</div>
                <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
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
