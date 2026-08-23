import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CalendarDays, Trash2 } from "lucide-react";
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#9C1915]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Apontamentos Existentes na Sala
                    </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700">
                    {issues.length}
                </Badge>
            </div>

            <div className="p-0">
                {issues.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic text-xs">
                        Nenhum apontamento registrado para esta sala ainda.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto custom-scrollbar">
                        {issues.map((ap: any) => (
                            <div
                                key={ap.id}
                                className="flex items-start gap-3 p-3.5 hover:bg-slate-50/60 transition-colors group"
                            >
                                <div className="shrink-0 w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-mono font-bold">
                                    #{ap.numeroApontamento || ap.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-1.5 bg-slate-50 text-slate-700">
                                            {ap.disciplina}
                                        </Badge>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {ap.data
                                                ? format(new Date(ap.data), "dd/MM/yyyy", {
                                                      locale: ptBR,
                                                  })
                                                : "—"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-snug font-medium">
                                        {ap.divergencia}
                                    </p>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="shrink-0 h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                    onClick={() => onDeleteIssue(ap.id)}
                                    disabled={isDeleting}
                                    title="Excluir apontamento"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
