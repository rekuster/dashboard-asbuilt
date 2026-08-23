import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ScopeFormModalProps {
    projectId: string;
    escopo?: any;
    selectedEdificacao?: string;
    onClose: () => void;
}

export function ScopeFormModal({
    projectId,
    escopo,
    selectedEdificacao,
    onClose,
}: ScopeFormModalProps) {
    const utils = trpc.useUtils();
    const mutation = trpc.dashboard.upsertEscopo.useMutation({
        onSuccess: () => {
            utils.dashboard.getEscopos.invalidate({ projectId });
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
            onClose();
        },
        onError: (error) => alert("Erro ao salvar: " + error.message),
    });

    const [formData, setFormData] = useState({
        id: escopo?.id,
        empresa: escopo?.empresa || "",
        disciplina: escopo?.disciplina || "",
        edificacao: escopo?.edificacao || selectedEdificacao || "",
        nomeModelo: escopo?.nomeModelo || "",
        nomeModeloFinal: escopo?.nomeModeloFinal || "",
        temRvtOriginal: escopo?.temRvtOriginal ?? 1,
        pendenciaRvt: escopo?.pendenciaRvt || "",
        acaoRvt: escopo?.acaoRvt || "",
        descricao: escopo?.descricao || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            projectId,
        } as any);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header Padronizado Stecla */}
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                {escopo ? "Editar Modelo no Escopo" : "Novo Modelo no Escopo"}
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Defina o modelo contratual esperado do parceiro ou projetista
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar text-xs">
                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Empresa *
                            </label>
                            <Input
                                required
                                value={formData.empresa}
                                onChange={(e) =>
                                    setFormData({ ...formData, empresa: e.target.value })
                                }
                                placeholder="Ex: Thá ou Ocle"
                                className="h-8 text-xs rounded-lg border-slate-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Disciplina *
                            </label>
                            <Input
                                required
                                value={formData.disciplina}
                                onChange={(e) =>
                                    setFormData({ ...formData, disciplina: e.target.value })
                                }
                                placeholder="Ex: Climatização"
                                className="h-8 text-xs rounded-lg border-slate-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Edificação *
                            </label>
                            <Input
                                required
                                value={formData.edificacao}
                                onChange={(e) =>
                                    setFormData({ ...formData, edificacao: e.target.value })
                                }
                                placeholder="Ex: Prédio Produção"
                                className="h-8 text-xs rounded-lg border-slate-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Nome do Modelo Final
                            </label>
                            <Input
                                value={formData.nomeModeloFinal}
                                onChange={(e) =>
                                    setFormData({ ...formData, nomeModeloFinal: e.target.value })
                                }
                                placeholder="Ex: NEO-23001-AS-CLI-001..."
                                className="h-8 text-xs rounded-lg border-slate-200"
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Modelo Base (Projeto Original) *
                            </label>
                            <Input
                                required
                                value={formData.nomeModelo}
                                onChange={(e) =>
                                    setFormData({ ...formData, nomeModelo: e.target.value })
                                }
                                placeholder="Ex: NEO-23001-PE-CLI-MO-000-R06"
                                className="h-8 text-xs rounded-lg border-slate-200"
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Possui RVT Original do Projeto? *
                            </label>
                            <select
                                className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                                value={formData.temRvtOriginal}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        temRvtOriginal: parseInt(e.target.value),
                                    })
                                }
                            >
                                <option value={1}>Sim, RVT Original Disponível (OK)</option>
                                <option value={0}>Não / Pendente de Envio</option>
                            </select>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Descrição / Escopo
                            </label>
                            <Textarea
                                value={formData.descricao}
                                onChange={(e) =>
                                    setFormData({ ...formData, descricao: e.target.value })
                                }
                                placeholder="Detalhes contratuais ou consolidação..."
                                className="resize-none rounded-lg border-slate-200 min-h-[50px] text-xs"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-8 px-4 text-xs font-semibold rounded-lg border-slate-200"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="h-8 px-5 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold shadow-xs"
                        >
                            {mutation.isPending ? "Salvando..." : "Salvar Modelo"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
