import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { List, Trash2, Send, Loader2, CheckCircle2 } from "lucide-react";
import { ApontamentoItem } from "../types";

interface PendingBatchListProps {
    items: ApontamentoItem[];
    onRemoveItem: (id: string) => void;
    onClearAll: () => void;
    onSaveAll: () => void;
    isSaving: boolean;
}

export function PendingBatchList({
    items,
    onRemoveItem,
    onClearAll,
    onSaveAll,
    isSaving,
}: PendingBatchListProps) {
    if (items.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-4 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-[#9C1915]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Itens Prontos para Salvar
                    </span>
                    <Badge className="bg-[#9C1915] text-white text-[10px] font-bold">
                        {items.length}
                    </Badge>
                </div>
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:underline"
                >
                    Limpar Tudo
                </button>
            </div>

            <div className="p-0">
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3.5 hover:bg-slate-50/60 transition-colors group"
                        >
                            <div className="shrink-0 w-6 h-6 rounded-md bg-red-50 text-[#9C1915] flex items-center justify-center text-xs font-bold">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-1.5 bg-red-50 text-[#9C1915] border-red-200">
                                        {item.disciplinaLabel}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-snug">
                                    {item.divergencia}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="shrink-0 h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                onClick={() => onRemoveItem(item.id)}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="p-3.5 bg-slate-50/50 border-t border-slate-200">
                    <Button
                        type="button"
                        className="w-full h-8 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs"
                        onClick={onSaveAll}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Salvando e Enviando Fotos...
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Sincronizar / Salvar Todos ({items.length})
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
