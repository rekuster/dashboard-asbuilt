import React from "react";
import { Card } from "@/components/ui/card";
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
        variant?: "default" | "success" | "warning" | "danger" | "info";
    };
    variant?: "default" | "blue" | "green" | "red" | "orange" | "purple";
    className?: string;
}

const ICON_VARIANT_STYLES: Record<
    NonNullable<KPICardProps["variant"]>,
    { badge: string; icon: string; valueText: string }
> = {
    default: {
        badge: "bg-slate-100 border border-slate-200/90",
        icon: "text-slate-700",
        valueText: "text-slate-900",
    },
    blue: {
        badge: "bg-sky-50 border border-sky-200",
        icon: "text-sky-600",
        valueText: "text-slate-900",
    },
    green: {
        badge: "bg-emerald-50 border border-emerald-200",
        icon: "text-emerald-600",
        valueText: "text-slate-900",
    },
    orange: {
        badge: "bg-amber-50 border border-amber-200",
        icon: "text-amber-600",
        valueText: "text-slate-900",
    },
    red: {
        badge: "bg-red-50 border border-red-200",
        icon: "text-[#9C1915]",
        valueText: "text-[#940707]",
    },
    purple: {
        badge: "bg-indigo-50 border border-indigo-200",
        icon: "text-indigo-600",
        valueText: "text-slate-900",
    },
};

export default function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    badge,
    variant = "default",
    className,
}: KPICardProps) {
    const styles = ICON_VARIANT_STYLES[variant] || ICON_VARIANT_STYLES.default;

    return (
        <Card
            className={`rounded-xl p-3.5 border border-slate-200/90 bg-white shadow-xs transition-all hover:border-slate-300 ${
                className || ""
            }`}
        >
            <div className="flex items-center justify-between mb-1.5 gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6C6A6A] truncate">
                    {title}
                </p>
                {Icon && (
                    <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${styles.badge}`}
                    >
                        <Icon className={`h-3.5 w-3.5 ${styles.icon}`} />
                    </div>
                )}
            </div>

            <div className="flex items-baseline gap-1.5">
                <span
                    className={`text-xl font-extrabold tracking-tight ${styles.valueText}`}
                >
                    {value}
                </span>
                {badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                        {badge.text}
                    </span>
                )}
            </div>

            <div className="flex items-center space-x-1.5 mt-0.5">
                <div className="text-[10px] font-medium text-[#6C6A6A] truncate">
                    {subtitle}
                </div>
                {trend && (
                    <span
                        className={`text-[9px] font-bold ${
                            trend.isPositive ? "text-emerald-700" : "text-[#940707]"
                        }`}
                    >
                        {trend.isPositive ? "+" : "-"}
                        {trend.value}%
                    </span>
                )}
            </div>
        </Card>
    );
}
