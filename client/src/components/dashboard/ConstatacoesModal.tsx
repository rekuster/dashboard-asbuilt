import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    X,
    AlertCircle,
    Plus,
    Trash2,
    Edit2,
    Save,
    Sparkles,
    Building2,
    Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ConstatacoesModalProps {
    projectId: string;
    empresa: string;
    isOpen: boolean;
    onClose: () => void;
}

interface ItemConstatacao {
    id?: number;
    edificacao: string;
    texto: string;
    destaque: number;
    ordem: number;
}

export function ConstatacoesModal({
    projectId,
    empresa,
    isOpen,
    onClose,
}: ConstatacoesModalProps) {
    const utils = trpc.useUtils();
    const targetEmpresa = empresa === "Todas" ? "Thá" : empresa;

    const { data: dbItems = [], isLoading } = trpc.analytics.getConstatacoes.useQuery(
        {
            projectId,
            empresa: targetEmpresa,
        },
        { enabled: isOpen }
    );

    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });

    const edificacoesList = React.useMemo(() => {
        const unique = Array.from(new Set(escopos.map((e: any) => e.edificacao))).filter(Boolean);
        if (unique.length === 0) {
            return ["Implantação", "Portaria", "Prédio Produção", "Prédio Suporte", "Central de Utilidades"];
        }
        return unique.sort();
    }, [escopos]);

    const [items, setItems] = useState<ItemConstatacao[]>([]);

    useEffect(() => {
        if (dbItems && dbItems.length > 0) {
            setItems(
                dbItems.map((d: any, idx: number) => ({
                    id: d.id,
                    edificacao: d.edificacao,
                    texto: d.texto,
                    destaque: d.destaque ?? 0,
                    ordem: d.ordem ?? idx,
                }))
            );
        } else if (!isLoading && dbItems.length === 0) {
            // Default inicial
            if (targetEmpresa.toLowerCase() === "thá" || targetEmpresa.toLowerCase() === "tha") {
                setItems([
                    {
                        edificacao: "Implantação",
                        texto: "Drenagem foi o único modelo com entregas parciais evolutivas conforme execução.",
                        destaque: 0,
                        ordem: 0,
                    },
                    {
                        edificacao: "Implantação",
                        texto: "Modelos de Estruturas de concreto (bancos, caixas, escadas) não entregues conforme execução.",
                        destaque: 0,
                        ordem: 1,
                    },
                    {
                        edificacao: "Prédio Suporte",
                        texto: "4 modelos entregues são cópias dos modelos de projeto sem qualquer representação do executado em campo.",
                        destaque: 1,
                        ordem: 2,
                    },
                    {
                        edificacao: "Portaria",
                        texto: "Nenhuma entrega realizada.",
                        destaque: 0,
                        ordem: 3,
                    },
                    {
                        edificacao: "Central de Utilidades",
                        texto: "Modelo de estrutura entregue apenas em .ifc. Estrutura do Pátio de Utilidades não entregue.",
                        destaque: 0,
                        ordem: 4,
                    },
                    {
                        edificacao: "Prédio Produção",
                        texto: "Modelos de Hidrossanitário são os mais críticos e as entregas não refletem o que foi executado.",
                        destaque: 1,
                        ordem: 5,
                    },
                ]);
            } else {
                setItems([
                    {
                        edificacao: "Prédio Produção",
                        texto: "Modelos de Climatização e Gases entregues com pendências pontuais de modelagem em conexões.",
                        destaque: 0,
                        ordem: 0,
                    },
                    {
                        edificacao: "Central de Utilidades",
                        texto: "Tubulações de utilidades validadas em campo com modelo RVT conforme execução.",
                        destaque: 0,
                        ordem: 1,
                    },
                    {
                        edificacao: "Implantação",
                        texto: "Rede de média tensão com pendência de validação em caixas de passagem.",
                        destaque: 1,
                        ordem: 2,
                    },
                ]);
            }
        }
    }, [dbItems, isLoading, targetEmpresa]);

    // Formulário para adicionar nova constatação
    const [novoEdif, setNovoEdif] = useState(edificacoesList[0] || "Implantação");
    const [novoTexto, setNovoTexto] = useState("");
    const [novoDestaque, setNovoDestaque] = useState(false);

    const handleAddItem = () => {
        if (!novoTexto.trim()) return;
        setItems((prev) => [
            ...prev,
            {
                edificacao: novoEdif,
                texto: novoTexto.trim(),
                destaque: novoDestaque ? 1 : 0,
                ordem: prev.length,
            },
        ]);
        setNovoTexto("");
        setNovoDestaque(false);
    };

    const handleRemoveItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateText = (index: number, val: string) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], texto: val };
            return next;
        });
    };

    const handleToggleDestaque = (index: number) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                destaque: next[index].destaque === 1 ? 0 : 1,
            };
            return next;
        });
    };

    const handleUpdateEdificacao = (index: number, val: string) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], edificacao: val };
            return next;
        });
    };

    const mutation = trpc.analytics.saveConstatacoes.useMutation({
        onSuccess: () => {
            utils.analytics.getAsBuiltModelsSummary.invalidate({
                projectId,
                empresa: targetEmpresa,
            });
            utils.analytics.getConstatacoes.invalidate({
                projectId,
                empresa: targetEmpresa,
            });
            onClose();
        },
        onError: (err) => alert("Erro ao salvar constatações: " + err.message),
    });

    const handleSave = async () => {
        await mutation.mutateAsync({
            projectId,
            empresa: targetEmpresa,
            items: items.map((it, idx) => ({
                ...it,
                ordem: idx,
            })),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                    Editar Constatações Técnicas
                                </h2>
                                <Badge className="bg-[#9C1915] text-white text-[10px] font-bold">
                                    {targetEmpresa} Engenharia
                                </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Personalize os pareceres executivos e pontos de atenção exibidos no painel
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

                {/* Body */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
                    {/* Bloco de Inserção de Nova Constatação */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-700 block">
                            Adicionar Nova Constatação Técnica
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-500">
                                    Edificação
                                </label>
                                <select
                                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                                    value={novoEdif}
                                    onChange={(e) => setNovoEdif(e.target.value)}
                                >
                                    {edificacoesList.map((ed) => (
                                        <option key={ed} value={ed}>
                                            {ed}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500">
                                    Parecer / Constatação
                                </label>
                                <Input
                                    value={novoTexto}
                                    onChange={(e) => setNovoTexto(e.target.value)}
                                    placeholder="Ex: 4 modelos entregues são cópias dos modelos de projeto..."
                                    className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddItem();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={novoDestaque}
                                    onChange={(e) => setNovoDestaque(e.target.checked)}
                                    className="w-4 h-4 accent-[#9C1915] rounded"
                                />
                                <span className={novoDestaque ? "font-bold text-[#9C1915]" : ""}>
                                    Ponto de atenção crítico (Destaque em Vermelho)
                                </span>
                            </label>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddItem}
                                disabled={!novoTexto.trim()}
                                className="h-7 px-3 text-xs font-bold rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Incluir
                            </Button>
                        </div>
                    </div>

                    {/* Lista de Constatações Existentes */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                            Constatações Ativas ({items.length})
                        </span>

                        {items.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                                Nenhuma constatação cadastrada para esta empresa.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-xl border transition-all ${
                                            item.destaque === 1
                                                ? "bg-red-50/50 border-red-200"
                                                : "bg-white border-slate-200 shadow-2xs"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-32 shrink-0">
                                                <select
                                                    className="flex h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-800"
                                                    value={item.edificacao}
                                                    onChange={(e) =>
                                                        handleUpdateEdificacao(idx, e.target.value)
                                                    }
                                                >
                                                    {edificacoesList.map((ed) => (
                                                        <option key={ed} value={ed}>
                                                            {ed}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <Input
                                                    value={item.texto}
                                                    onChange={(e) =>
                                                        handleUpdateText(idx, e.target.value)
                                                    }
                                                    className={`h-7 text-xs rounded-md border-slate-200 ${
                                                        item.destaque === 1
                                                            ? "font-bold text-[#9C1915] bg-white"
                                                            : "text-slate-800 bg-white"
                                                    }`}
                                                />
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleDestaque(idx)}
                                                    className={`h-7 px-2 text-[10px] font-bold rounded-md ${
                                                        item.destaque === 1
                                                            ? "bg-red-100 text-[#9C1915] hover:bg-red-200"
                                                            : "text-slate-500 hover:bg-slate-100"
                                                    }`}
                                                    title="Alternar destaque em vermelho"
                                                >
                                                    {item.destaque === 1 ? "🚨 Crítico" : "Normal"}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                                    title="Excluir constatação"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
                    <span className="text-[11px] text-slate-500">
                        {items.length} {items.length === 1 ? "item cadastrado" : "itens cadastrados"} para {targetEmpresa}
                    </span>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-8 px-4 text-xs font-semibold rounded-lg border-slate-200"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={mutation.isPending}
                            className="h-8 px-5 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold shadow-xs gap-1.5"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {mutation.isPending ? "Salvando..." : "Salvar Constatações"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
