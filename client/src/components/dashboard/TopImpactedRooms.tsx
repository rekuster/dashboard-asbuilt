import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";

interface TopImpactedRoomsProps {
    data: { sala: string; count: number; edificacao: string }[];
    hideTitle?: boolean;
}

export default function TopImpactedRooms({ data, hideTitle }: TopImpactedRoomsProps) {
    const content = (
        <div className="space-y-2">
            {data.length > 0 ? (
                data.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                {index + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 leading-tight">
                                    {item.sala}
                                </span>
                                <span className="text-[9px] text-[#6C6A6A] font-semibold uppercase">
                                    {item.edificacao}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-50 text-[#940707] border border-red-200 rounded text-[10px] font-bold">
                                {item.count} divergências
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs">
                    Nenhuma divergência registrada.
                </div>
            )}
        </div>
    );

    if (hideTitle) return content;

    return (
        <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#940707]" />
                    Salas Mais Impactadas
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">{content}</CardContent>
        </Card>
    );
}
