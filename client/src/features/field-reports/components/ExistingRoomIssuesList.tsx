import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExistingRoomIssuesListProps {
    issues: any[];
    onDeleteIssue: (id: number) => void;
    isDeleting: boolean;
}

export function ExistingRoomIssuesList({
    issues,
    onDeleteIssue,
    isDeleting,
}: ExistingRoomIssuesListProps) {
    return (
        <Card className="shadow-sm border-slate-100 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Apontamentos Existentes na Sala
                    {issues.length > 0 && (
                        <span className="ml-2 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {issues.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {issues.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-xs">
                        Nenhum apontamento registrado para esta sala ainda.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {issues.map((ap: any) => (
                            <div
                                key={ap.id}
                                className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors group"
                            >
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-mono font-bold">
                                    #{ap.numeroApontamento || ap.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                            {ap.disciplina}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {ap.data
                                                ? format(new Date(ap.data), "dd/MM/yyyy", {
                                                      locale: ptBR,
                                                  })
                                                : "—"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        {ap.divergencia}
                                    </p>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="flex-shrink-0 h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                    onClick={() => onDeleteIssue(ap.id)}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
