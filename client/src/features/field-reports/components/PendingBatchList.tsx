import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { List, Trash2, Send, Loader2 } from "lucide-react";
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
        <Card className="shadow-md border-red-100 bg-red-50/20 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="py-4 px-6 border-b border-red-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                    <List className="w-4 h-4 text-[#940707]" />
                    Itens Prontos para Salvar
                    <span className="ml-2 text-xs font-black bg-[#940707] text-white px-2.5 py-0.5 rounded-full">
                        {items.length}
                    </span>
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full text-xs"
                    onClick={onClearAll}
                >
                    Limpar Tudo
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-red-100/50">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-4 p-4 hover:bg-white transition-colors group"
                        >
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#940707]/10 text-[#940707] flex items-center justify-center text-xs font-black">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#940707] text-white">
                                        {item.disciplinaLabel}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                    {item.divergencia}
                                </p>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="flex-shrink-0 h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                onClick={() => onRemoveItem(item.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-white border-t border-red-100 rounded-b-3xl">
                    <Button
                        className="w-full h-12 rounded-full bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold gap-2 shadow-lg shadow-[#940707]/20"
                        onClick={onSaveAll}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvando e Enviando Fotos...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Sincronizar / Salvar Todos ({items.length})
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
