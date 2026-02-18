import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";

interface TopImpactedRoomsProps {
    data: { sala: string; count: number; edificacao: string }[];
    hideTitle?: boolean;
}

export default function TopImpactedRooms({ data, hideTitle }: TopImpactedRoomsProps) {
    const content = (
        <div className="space-y-4">
            {data.length > 0 ? (
                data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border group hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{item.sala}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{item.edificacao}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">
                                {item.count} apontamentos
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                    Nenhuma divergência registrada.
                </div>
            )}
        </div>
    );

    if (hideTitle) return content;

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    Salas Mais Impactadas
                </CardTitle>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    );
}
