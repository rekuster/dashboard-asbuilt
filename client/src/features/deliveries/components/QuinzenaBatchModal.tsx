import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    X,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    CopyCheck,
    Layers,
    Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface QuinzenaBatchModalProps {
    projectId: string;
    selectedEscopos: any[];
    onClose: () => void;
    onSuccess?: () => void;
}

const STATUS_OPTIONS = [
    {
        value: "VALIDADO",
        label: "Validado",
        color: "bg-emerald-50 text-emerald-700 border-emerald-300",
        activeColor: "bg-emerald-600 text-white border-emerald-600",
        icon: CheckCircle2,
    },
    {
        value: "COM_PENDENCIAS",
        label: "Com Pendências",
        color: "bg-amber-50 text-amber-700 border-amber-300",
        activeColor: "bg-amber-500 text-slate-950 border-amber-500",
        icon: AlertTriangle,
    },
    {
        value: "IGUAL_PROJETO",
        label: "Igual ao Projeto",
        color: "bg-red-50 text-[#9C1915] border-red-300",
        activeColor: "bg-[#9C1915] text-white border-[#9C1915]",
        icon: CopyCheck,
    },
];

export function QuinzenaBatchModal({
    projectId,
    selectedEscopos,
    onClose,
    onSuccess,
}: QuinzenaBatchModalProps) {
    const utils = trpc.useUtils();

    const [identificadorPacote, setIdentificadorPacote] = useState("SM 41");
    const [dataRecebida, setDataRecebida] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [itemsState, setItemsState] = useState<
        Record<
            number,
            {
                statusModelo: string;
                parecerTecnico: string;
                pranchasValidadas?: number;
            }
        >
    >(() => {
        const init: Record<
            number,
            { statusModelo: string; parecerTecnico: string; pranchasValidadas?: number }
        > = {};
        for (const esc of selectedEscopos) {
            init[esc.id] = {
                statusModelo:
                    esc.statusAuditoria && esc.statusAuditoria !== "NAO_ENTREGUE"
                        ? esc.statusAuditoria
                        : "COM_PENDENCIAS",
                parecerTecnico: esc.parecerTecnico || "",
                pranchasValidadas: esc.pranchasValidadas ?? 0,
            };
        }
        return init;
    });

    const batchMutation = trpc.dashboard.registrarQuinzenaModulos.useMutation({
        onSuccess: () => {
            utils.dashboard.getEscopos.invalidate({ projectId });
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
            utils.analytics.getAsBuiltModelsSummary.invalidate({ projectId });
            onSuccess?.();
            onClose();
        },
        onError: (err) => alert("Erro ao registrar quinzena: " + err.message),
    });

    const applyGlobalStatus = (status: string) => {
        setItemsState((prev) => {
            const next = { ...prev };
            for (const id of Object.keys(next)) {
                next[Number(id)] = { ...next[Number(id)], statusModelo: status };
            }
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!identificadorPacote.trim()) {
            alert("Informe o pacote/quinzena (Ex: SM 40).");
            return;
        }
        batchMutation.mutate({
            projectId,
            identificadorEntrega: identificadorPacote.trim(),
            dataRecebimento: dataRecebida,
            itens: selectedEscopos.map((esc) => ({
                escopoId: esc.id,
                statusModelo: itemsState[esc.id]?.statusModelo || "COM_PENDENCIAS",
                parecerTecnico: itemsState[esc.id]?.parecerTecnico || undefined,
                pranchasValidadas: itemsState[esc.id]?.pranchasValidadas,
            })),
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-[#9C1915] flex items-center justify-center border border-red-100">
                            <Calendar className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                Check-in de Recebimento Quinzenal ({selectedEscopos.length} Modelos)
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Registre o pacote quinzenal (SM) para os modelos selecionados na Lista Mestra sem redigitar dados cadastrais.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 rounded-lg p-1.5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-xs"
                >
                    {/* Identificação da Quinzena + Ação Rápida em Lote */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-600">
                                Pacote / Semana (SM) *
                            </label>
                            <Input
                                required
                                value={identificadorPacote}
                                onChange={(e) => setIdentificadorPacote(e.target.value)}
                                placeholder="Ex: SM 40 ou Quinzena 15"
                                className="h-8.5 text-xs font-bold bg-white border-slate-200"
                            />
                        </div>
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-600">
                                Data do Recebimento *
                            </label>
                            <Input
                                type="date"
                                required
                                value={dataRecebida}
                                onChange={(e) => setDataRecebida(e.target.value)}
                                className="h-8.5 text-xs font-bold bg-white border-slate-200"
                            />
                        </div>
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-600">
                                Marcar Todos Como:
                            </label>
                            <div className="flex items-center gap-1.5 pt-0.5">
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => applyGlobalStatus(opt.value)}
                                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${opt.color}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lista de Modelos Selecionados */}
                    <div className="space-y-2.5">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#9C1915]" />
                            Classificação Individual por Modelo Recebido
                        </div>

                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                            {selectedEscopos.map((esc) => {
                                const state = itemsState[esc.id] || {
                                    statusModelo: "COM_PENDENCIAS",
                                    parecerTecnico: "",
                                };
                                return (
                                    <div
                                        key={esc.id}
                                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2.5"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 border-slate-200"
                                                >
                                                    {esc.empresa}
                                                </Badge>
                                                <span className="font-bold text-slate-900 text-xs">
                                                    {esc.edificacao} • {esc.disciplina}
                                                </span>
                                                <span className="font-mono text-[10px] text-slate-500">
                                                    ({esc.nomeModelo})
                                                </span>
                                            </div>

                                            {/* Botões de Status */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {STATUS_OPTIONS.map((opt) => {
                                                    const Icon = opt.icon;
                                                    const active = state.statusModelo === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() =>
                                                                setItemsState((prev) => ({
                                                                    ...prev,
                                                                    [esc.id]: {
                                                                        ...prev[esc.id],
                                                                        statusModelo: opt.value,
                                                                    },
                                                                }))
                                                            }
                                                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                                                                active ? opt.activeColor : opt.color
                                                            }`}
                                                        >
                                                            <Icon className="w-3 h-3" />
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={state.parecerTecnico}
                                                onChange={(e) =>
                                                    setItemsState((prev) => ({
                                                        ...prev,
                                                        [esc.id]: {
                                                            ...prev[esc.id],
                                                            parecerTecnico: e.target.value,
                                                        },
                                                    }))
                                                }
                                                placeholder="Parecer rápido / motivo de retorno (ex: Modelo idêntico ao projeto, divergências de campo não incorporadas...)"
                                                className="h-7.5 text-[11px] border-slate-200 bg-slate-50/60"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={batchMutation.isPending}
                            className="h-9 px-5 rounded-xl bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-2 shadow-sm"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {batchMutation.isPending
                                ? "Registrando Quinzena..."
                                : `Confirmar Recebimento (${identificadorPacote})`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
