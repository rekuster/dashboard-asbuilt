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
    className?: string;
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, className }: KPICardProps) {
    return (
        <Card className={`hover:shadow-md transition-shadow ${className || ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
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
