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
    variant?: "default" | "blue" | "green" | "red" | "orange";
    className?: string;
}

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
    const isRed = variant === "red";

    return (
        <Card
            className={`rounded-xl p-3.5 border border-slate-200/90 bg-white shadow-xs transition-all hover:border-slate-300 ${
                className || ""
            }`}
        >
            <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6C6A6A] truncate">
                    {title}
                </p>
                {Icon && (
                    <Icon
                        className={`h-3.5 w-3.5 ${
                            isRed ? "text-[#940707]" : "text-[#6C6A6A]"
                        } opacity-70`}
                    />
                )}
            </div>

            <div className="flex items-baseline gap-1.5">
                <span
                    className={`text-xl font-extrabold tracking-tight ${
                        isRed ? "text-[#940707]" : "text-slate-900"
                    }`}
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
