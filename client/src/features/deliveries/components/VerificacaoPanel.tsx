import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VerificacaoPanelProps {
    entregaId: number;
    onDone: () => void;
    onCancel: () => void;
}

export function VerificacaoPanel({ entregaId, onDone, onCancel }: VerificacaoPanelProps) {
    const [resultado, setResultado] = useState<string>("");
    const [apontamentos, setApontamentos] = useState("");

    const mutation = trpc.dashboard.registrarVerificacao.useMutation({
        onSuccess: () => onDone(),
        onError: (error) => alert("Erro ao registrar verificação: " + error.message),
    });

    const handleSubmit = () => {
        if (!resultado) return alert("Selecione o resultado da verificação.");
        if (resultado === "NAO_CONFORME" && !apontamentos.trim()) {
            return alert("Informe os apontamentos para itens não conformes.");
        }
        mutation.mutate({
            id: entregaId,
            resultado,
            apontamentosVerificacao: apontamentos || null,
        });
    };

    return (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in slide-in-from-top-3 duration-300">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#940707]" />
                Registrar Verificação
            </h4>
            <div className="flex gap-3 mb-3">
                <button
                    type="button"
                    className={`flex-1 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                        resultado === "CONFORME"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-400 hover:border-emerald-200"
                    }`}
                    onClick={() => setResultado("CONFORME")}
                >
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    Conforme
                </button>
                <button
                    type="button"
                    className={`flex-1 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                        resultado === "NAO_CONFORME"
                            ? "border-rose-500 bg-rose-50 text-rose-700"
                            : "border-slate-200 text-slate-400 hover:border-rose-200"
                    }`}
                    onClick={() => setResultado("NAO_CONFORME")}
                >
                    <XCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                    Não Conforme
                </button>
            </div>
            {resultado === "NAO_CONFORME" && (
                <div className="mb-3">
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                        Apontamentos *
                    </label>
                    <Textarea
                        value={apontamentos}
                        onChange={(e) => setApontamentos(e.target.value)}
                        placeholder="Descreva as divergências encontradas..."
                        className="resize-none rounded-xl border-slate-200 min-h-[80px] mt-1 text-xs"
                    />
                </div>
            )}
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-full text-xs">
                    Cancelar
                </Button>
                <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={mutation.isPending || !resultado}
                    className="rounded-full px-6 bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold"
                >
                    {mutation.isPending ? "Salvando..." : "Confirmar Verificação"}
                </Button>
            </div>
        </div>
    );
}
