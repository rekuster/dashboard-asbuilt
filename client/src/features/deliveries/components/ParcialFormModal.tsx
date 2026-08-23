import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
import { STATUS_LABELS } from "../constants";

interface ParcialFormModalProps {
    escopo: any;
    parcialCount: number;
    onClose: () => void;
}

export function ParcialFormModal({ escopo, parcialCount, onClose }: ParcialFormModalProps) {
    const utils = trpc.useUtils();
    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregasByEscopo.invalidate({ escopoId: escopo.id });
            utils.dashboard.getEntregas.invalidate();
            utils.dashboard.getEntregasStats.invalidate();
            onClose();
        },
        onError: (error) => alert("Erro ao registrar parcial: " + error.message),
    });

    const nextNum = parcialCount + 1;
    const [formData, setFormData] = useState({
        nomeDocumento: `Parcial #${nextNum} — ${escopo.nomeModelo}`,
        tipoDocumento: "rvt",
        edificacao: escopo.edificacao,
        disciplina: escopo.disciplina,
        empresaResponsavel: escopo.empresa,
        dataPrevista: dayjs().format("YYYY-MM-DD"),
        dataRecebimento: dayjs().format("YYYY-MM-DD"),
        periodoInicio: "",
        periodoFim: "",
        status: "RECEBIDO",
        descricao: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            escopoId: escopo.id,
            dataRecebimento: formData.dataRecebimento || null,
            periodoInicio: formData.periodoInicio || null,
            periodoFim: formData.periodoFim || null,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-[#940707] p-6 text-white">
                    <h2 className="text-lg font-bold">Registrar Entrega Parcial</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                        {escopo.empresa} — {escopo.disciplina} — {escopo.edificacao}
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                            Nome do Documento
                        </label>
                        <Input
                            value={formData.nomeDocumento}
                            onChange={(e) =>
                                setFormData({ ...formData, nomeDocumento: e.target.value })
                            }
                            className="rounded-xl border-slate-200 text-xs"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Período Início
                            </label>
                            <Input
                                type="date"
                                value={formData.periodoInicio}
                                onChange={(e) =>
                                    setFormData({ ...formData, periodoInicio: e.target.value })
                                }
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Período Fim
                            </label>
                            <Input
                                type="date"
                                value={formData.periodoFim}
                                onChange={(e) =>
                                    setFormData({ ...formData, periodoFim: e.target.value })
                                }
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Data Recebimento
                            </label>
                            <Input
                                type="date"
                                value={formData.dataRecebimento}
                                onChange={(e) =>
                                    setFormData({ ...formData, dataRecebimento: e.target.value })
                                }
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Status
                            </label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs font-bold"
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({ ...formData, status: e.target.value })
                                }
                            >
                                {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                    <option key={val} value={val}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                            Observações
                        </label>
                        <Textarea
                            value={formData.descricao}
                            onChange={(e) =>
                                setFormData({ ...formData, descricao: e.target.value })
                            }
                            placeholder="Notas adicionais..."
                            className="resize-none rounded-xl border-slate-200 min-h-[60px] text-xs"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-full text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="rounded-full px-8 bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold"
                        >
                            {mutation.isPending ? "Salvando..." : "Registrar"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
