import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    X,
    FileText,
    Plus,
    Trash2,
    CheckSquare,
    Layers,
    ClipboardList,
    Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
import { DELIVERY_STATUS_OPTIONS } from "../constants";

interface DeliveryFormModalProps {
    projectId: string;
    onClose: () => void;
    entrega?: any;
    selectedEdificacao?: string;
}

interface DocumentRow {
    id: string;
    nomeDocumento: string;
    formato: string;
    disciplina: string;
    edificacao: string;
    escopoId?: number | null;
    modeloBaseReferencia?: string | null;
}

export function DeliveryFormModal({
    projectId,
    onClose,
    entrega,
    selectedEdificacao,
}: DeliveryFormModalProps) {
    const utils = trpc.useUtils();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });
    const { data: allEntregas = [] } = trpc.dashboard.getEntregas.useQuery({ projectId });

    const isNew = !entrega?.id;

    // Mutations
    const upsertSingleMutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
            utils.dashboard.getEscopos.invalidate({ projectId });
            onClose();
        },
        onError: (error) => alert("Erro ao salvar: " + error.message),
    });

    const createBatchMutation = trpc.dashboard.createBatchEntregas.useMutation({
        onSuccess: (res) => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
            utils.dashboard.getEscopos.invalidate({ projectId });
            onClose();
        },
        onError: (error) => alert("Erro ao salvar pacote: " + error.message),
    });

    const isPending = upsertSingleMutation.isPending || createBatchMutation.isPending;

    // Listas únicas
    const edificacoesList = useMemo(() => {
        const unique = Array.from(new Set(escopos.map((e: any) => e.edificacao))).sort();
        return unique;
    }, [escopos]);

    const empresasList = useMemo(() => {
        const unique = Array.from(new Set(escopos.map((e: any) => e.empresa))).sort();
        return unique;
    }, [escopos]);

    const disciplinasList = useMemo(() => {
        const unique = Array.from(new Set(escopos.map((e: any) => e.disciplina))).sort();
        return unique;
    }, [escopos]);

    // Estado para Remessa / Pacote (Header comum)
    const [pacoteData, setPacoteData] = useState({
        identificadorEntrega: entrega?.identificadorEntrega || "",
        empresaResponsavel: entrega?.empresaResponsavel || (empresasList[0] || "Thá"),
        dataRecebimento: entrega?.dataRecebimento
            ? dayjs(entrega.dataRecebimento).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD"),
        edificacaoPadrao: entrega?.edificacao || selectedEdificacao || (edificacoesList[0] || "Prédio Produção"),
        disciplinaPadrao: entrega?.disciplina || (disciplinasList[0] || "Geral"),
        status: entrega?.status || "COM_PENDENCIAS",
        descricao: entrega?.descricao || "",
        manualEmpresa: false,
        manualEdificacao: false,
    });

    // Lista de documentos na remessa
    const [documentos, setDocumentos] = useState<DocumentRow[]>(() => {
        if (entrega?.id) {
            return [
                {
                    id: String(entrega.id),
                    nomeDocumento: entrega.nomeDocumento || "",
                    formato: entrega.formato || "rvt",
                    disciplina: entrega.disciplina || "",
                    edificacao: entrega.edificacao || "",
                    escopoId: entrega.escopoId || null,
                    modeloBaseReferencia: entrega.modeloBaseReferencia || null,
                },
            ];
        }
        return [
            {
                id: "doc-1",
                nomeDocumento: "",
                formato: "rvt",
                disciplina: pacoteData.disciplinaPadrao || "",
                edificacao: pacoteData.edificacaoPadrao || "",
                escopoId: null,
                modeloBaseReferencia: "",
            },
        ];
    });

    // Modais auxiliares: Seleção por Escopo e Colar em Lote
    const [showScopePicker, setShowScopePicker] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [selectedScopeIds, setSelectedScopeIds] = useState<number[]>([]);

    // Filtro de modelos do escopo disponíveis para a empresa selecionada
    const escoposDaEmpresa = useMemo(() => {
        return escopos.filter(
            (esc: any) =>
                !pacoteData.empresaResponsavel ||
                esc.empresa?.toLowerCase() === pacoteData.empresaResponsavel.toLowerCase()
        );
    }, [escopos, pacoteData.empresaResponsavel]);

    const handleAddDocumentRow = () => {
        setDocumentos((prev) => [
            ...prev,
            {
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                nomeDocumento: "",
                formato: "rvt",
                disciplina: pacoteData.disciplinaPadrao || "",
                edificacao: pacoteData.edificacaoPadrao || "",
                escopoId: null,
                modeloBaseReferencia: "",
            },
        ]);
    };

    const handleRemoveDocumentRow = (index: number) => {
        if (documentos.length === 1 && isNew) {
            setDocumentos([
                {
                    id: `doc-${Date.now()}`,
                    nomeDocumento: "",
                    formato: "rvt",
                    disciplina: pacoteData.disciplinaPadrao || "",
                    edificacao: pacoteData.edificacaoPadrao || "",
                    escopoId: null,
                    modeloBaseReferencia: "",
                },
            ]);
            return;
        }
        setDocumentos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateDocumentRow = (index: number, field: keyof DocumentRow, value: any) => {
        setDocumentos((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };

            // Se selecionou um escopoId, preenche automaticamente disciplina, edificação e modelo base
            if (field === "escopoId" && value) {
                const esc = escopos.find((e: any) => e.id === parseInt(value));
                if (esc) {
                    next[index].disciplina = esc.disciplina;
                    next[index].edificacao = esc.edificacao;
                    next[index].modeloBaseReferencia = esc.nomeModelo;
                    if (!next[index].nomeDocumento) {
                        next[index].nomeDocumento = esc.nomeModeloFinal || esc.nomeModelo;
                    }
                }
            }
            return next;
        });
    };

    // Adiciona modelos selecionados da lista mestra à lista de documentos
    const handleConfirmScopeSelection = () => {
        const selected = escopos.filter((e: any) => selectedScopeIds.includes(e.id));
        const newRows: DocumentRow[] = selected.map((esc: any) => ({
            id: `scope-${esc.id}-${Date.now()}`,
            nomeDocumento: esc.nomeModeloFinal || esc.nomeModelo,
            formato: "rvt",
            disciplina: esc.disciplina,
            edificacao: esc.edificacao,
            escopoId: esc.id,
            modeloBaseReferencia: esc.nomeModelo,
        }));

        // Remove linhas vazias antes de adicionar
        const existingValid = documentos.filter((d) => d.nomeDocumento.trim().length > 0);
        setDocumentos([...existingValid, ...newRows]);
        setSelectedScopeIds([]);
        setShowScopePicker(false);
    };

    // Processa texto colado (1 arquivo por linha)
    const handleConfirmPaste = () => {
        const lines = pasteText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        if (lines.length === 0) {
            setShowPasteModal(false);
            return;
        }

        const newRows: DocumentRow[] = lines.map((line, idx) => {
            let formato = "rvt";
            const lower = line.toLowerCase();
            if (lower.endsWith(".ifc")) formato = "ifc";
            else if (lower.endsWith(".dwg")) formato = "dwg";
            else if (lower.endsWith(".pdf")) formato = "pdf";

            return {
                id: `paste-${Date.now()}-${idx}`,
                nomeDocumento: line,
                formato,
                disciplina: pacoteData.disciplinaPadrao || "",
                edificacao: pacoteData.edificacaoPadrao || "",
                escopoId: null,
                modeloBaseReferencia: "",
            };
        });

        const existingValid = documentos.filter((d) => d.nomeDocumento.trim().length > 0);
        setDocumentos([...existingValid, ...newRows]);
        setPasteText("");
        setShowPasteModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validDocs = documentos.filter((d) => d.nomeDocumento.trim().length > 0);
        if (validDocs.length === 0) {
            alert("Adicione pelo menos 1 documento com nome válido.");
            return;
        }

        if (!pacoteData.identificadorEntrega.trim()) {
            alert("Informe a identificação do Pacote / SM (ex: SM 28 - 12.07.2025).");
            return;
        }

        // Se estiver editando um documento individual
        if (!isNew && entrega?.id) {
            const first = validDocs[0];
            await upsertSingleMutation.mutateAsync({
                id: entrega.id,
                identificadorEntrega: pacoteData.identificadorEntrega,
                empresaResponsavel: pacoteData.empresaResponsavel,
                dataRecebimento: pacoteData.dataRecebimento,
                dataPrevista: pacoteData.dataRecebimento,
                status: pacoteData.status,
                descricao: pacoteData.descricao,
                nomeDocumento: first.nomeDocumento,
                formato: first.formato,
                tipoDocumento: first.formato === "rvt" || first.formato === "ifc" ? "rvt" : "relatorio",
                isModelo: first.formato === "rvt" || first.formato === "ifc" ? 1 : 0,
                edificacao: first.edificacao || pacoteData.edificacaoPadrao,
                disciplina: first.disciplina || pacoteData.disciplinaPadrao,
                escopoId: first.escopoId || undefined,
                modeloBaseReferencia: first.modeloBaseReferencia || null,
            });
            return;
        }

        // Criação em lote de múltiplos documentos no mesmo pacote
        await createBatchMutation.mutateAsync({
            projectId,
            identificadorEntrega: pacoteData.identificadorEntrega,
            empresaResponsavel: pacoteData.empresaResponsavel,
            dataRecebimento: pacoteData.dataRecebimento,
            status: pacoteData.status,
            edificacaoPadrao: pacoteData.edificacaoPadrao,
            disciplinaPadrao: pacoteData.disciplinaPadrao,
            descricao: pacoteData.descricao,
            documentos: validDocs.map((d) => ({
                nomeDocumento: d.nomeDocumento,
                formato: d.formato,
                edificacao: d.edificacao || pacoteData.edificacaoPadrao,
                disciplina: d.disciplina || pacoteData.disciplinaPadrao,
                escopoId: d.escopoId || null,
                modeloBaseReferencia: d.modeloBaseReferencia || null,
            })),
        });
    };

    const validDocumentCount = documentos.filter((d) => d.nomeDocumento.trim().length > 0).length;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header Padronizado Stecla */}
                <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                                {isNew
                                    ? "Nova Remessa de Entrega (Cadastro de Pacote)"
                                    : "Editar Entrega"}
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                {isNew
                                    ? "Defina o pacote/SM e adicione múltiplos modelos ou documentos recebidos de uma só vez"
                                    : "Atualize os dados do documento selecionado"}
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

                {/* Form Body */}
                <form
                    onSubmit={handleSubmit}
                    className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs"
                >
                    {/* SEÇÃO 1: CABEÇALHO DO PACOTE / REMESSA */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#9C1915]" />
                                Dados do Pacote / Remessa
                            </span>
                            <Badge variant="outline" className="text-[9px] font-bold bg-white text-slate-600">
                                {validDocumentCount} {validDocumentCount === 1 ? "documento" : "documentos"} no pacote
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Pacote / SM */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold uppercase text-[#9C1915]">
                                    Nome do Pacote / SM *
                                </label>
                                <Input
                                    required
                                    value={pacoteData.identificadorEntrega}
                                    onChange={(e) =>
                                        setPacoteData({
                                            ...pacoteData,
                                            identificadorEntrega: e.target.value,
                                        })
                                    }
                                    placeholder="Ex: 002. SM 28 - 12.07.2025 ou Pacote 05"
                                    className="h-8 text-xs font-semibold rounded-lg border-slate-300 bg-white"
                                />
                            </div>

                            {/* Empreiteiro / Fornecedor */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold uppercase text-slate-600">
                                        Empreiteiro *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPacoteData((prev) => ({
                                                ...prev,
                                                manualEmpresa: !prev.manualEmpresa,
                                            }))
                                        }
                                        className="text-[9px] font-bold text-[#9C1915] hover:underline"
                                    >
                                        {pacoteData.manualEmpresa ? "Listar" : "Digitar"}
                                    </button>
                                </div>
                                {pacoteData.manualEmpresa ? (
                                    <Input
                                        required
                                        value={pacoteData.empresaResponsavel}
                                        onChange={(e) =>
                                            setPacoteData({
                                                ...pacoteData,
                                                empresaResponsavel: e.target.value,
                                            })
                                        }
                                        placeholder="Nome da Empresa..."
                                        className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                                    />
                                ) : (
                                    <select
                                        required
                                        className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                                        value={pacoteData.empresaResponsavel}
                                        onChange={(e) =>
                                            setPacoteData({
                                                ...pacoteData,
                                                empresaResponsavel: e.target.value,
                                            })
                                        }
                                    >
                                        {empresasList.map((emp: any) => (
                                            <option key={emp} value={emp}>
                                                {emp}
                                            </option>
                                        ))}
                                        {!empresasList.includes(pacoteData.empresaResponsavel) && pacoteData.empresaResponsavel && (
                                            <option value={pacoteData.empresaResponsavel}>
                                                {pacoteData.empresaResponsavel}
                                            </option>
                                        )}
                                    </select>
                                )}
                            </div>

                            {/* Data de Entrega */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Data de Recebimento *
                                </label>
                                <Input
                                    type="date"
                                    required
                                    value={pacoteData.dataRecebimento}
                                    onChange={(e) =>
                                        setPacoteData({
                                            ...pacoteData,
                                            dataRecebimento: e.target.value,
                                        })
                                    }
                                    className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                                />
                            </div>

                            {/* Edificação Padrão */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold uppercase text-slate-600">
                                        Edificação Padrão
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPacoteData((prev) => ({
                                                ...prev,
                                                manualEdificacao: !prev.manualEdificacao,
                                            }))
                                        }
                                        className="text-[9px] font-bold text-[#9C1915] hover:underline"
                                    >
                                        {pacoteData.manualEdificacao ? "Listar" : "Digitar"}
                                    </button>
                                </div>
                                {pacoteData.manualEdificacao ? (
                                    <Input
                                        value={pacoteData.edificacaoPadrao}
                                        onChange={(e) =>
                                            setPacoteData({
                                                ...pacoteData,
                                                edificacaoPadrao: e.target.value,
                                            })
                                        }
                                        placeholder="Ex: Prédio Produção"
                                        className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                                    />
                                ) : (
                                    <select
                                        className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                                        value={pacoteData.edificacaoPadrao}
                                        onChange={(e) =>
                                            setPacoteData({
                                                ...pacoteData,
                                                edificacaoPadrao: e.target.value,
                                            })
                                        }
                                    >
                                        {edificacoesList.map((edif: any) => (
                                            <option key={edif} value={edif}>
                                                {edif}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Status da Remessa */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Status Inicial *
                                </label>
                                <select
                                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                                    value={pacoteData.status}
                                    onChange={(e) =>
                                        setPacoteData({
                                            ...pacoteData,
                                            status: e.target.value,
                                        })
                                    }
                                >
                                    {DELIVERY_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Descrição Opcional */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Observações do Pacote
                                </label>
                                <Input
                                    value={pacoteData.descricao}
                                    onChange={(e) =>
                                        setPacoteData({
                                            ...pacoteData,
                                            descricao: e.target.value,
                                        })
                                    }
                                    placeholder="Notas gerais sobre a remessa..."
                                    className="h-8 text-xs rounded-lg border-slate-200 bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 2: LISTA DE MODELOS / DOCUMENTOS */}
                    <div className="space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                                    Documentos e Modelos Entregues ({documentos.length})
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Adicione arquivos manualmente, selecione da lista mestra ou cole múltiplos nomes
                                </span>
                            </div>

                            {isNew && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowScopePicker(true)}
                                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 gap-1"
                                    >
                                        <CheckSquare className="w-3.5 h-3.5 text-[#9C1915]" />
                                        Da Lista Mestra
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowPasteModal(true)}
                                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 gap-1"
                                    >
                                        <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                                        Colar em Lote
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddDocumentRow}
                                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Adicionar Linha
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Tabela de Linhas de Documentos */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                        <tr className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                            <th className="py-2 px-3 w-8">#</th>
                                            <th className="py-2 px-3">Nome do Documento / Arquivo *</th>
                                            <th className="py-2 px-2 w-28">Formato</th>
                                            <th className="py-2 px-2 w-36">Disciplina</th>
                                            <th className="py-2 px-2 w-48">Vincular Modelo Mestre</th>
                                            <th className="py-2 px-2 w-10 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {documentos.map((doc, idx) => (
                                            <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-2 px-3 text-slate-400 font-bold text-[10px]">
                                                    {idx + 1}
                                                </td>

                                                {/* Nome do Documento */}
                                                <td className="py-1.5 px-3">
                                                    <Input
                                                        required
                                                        value={doc.nomeDocumento}
                                                        onChange={(e) =>
                                                            handleUpdateDocumentRow(
                                                                idx,
                                                                "nomeDocumento",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Ex: NEO-23001-AS-BAR-001-R00"
                                                        className="h-7 text-xs font-mono rounded-md border-slate-200"
                                                    />
                                                </td>

                                                {/* Formato */}
                                                <td className="py-1.5 px-2">
                                                    <select
                                                        className="flex h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800"
                                                        value={doc.formato}
                                                        onChange={(e) =>
                                                            handleUpdateDocumentRow(
                                                                idx,
                                                                "formato",
                                                                e.target.value
                                                            )
                                                        }
                                                    >
                                                        <option value="rvt">Revit (RVT)</option>
                                                        <option value="ifc">BIM (IFC)</option>
                                                        <option value="dwg">Desenho (DWG)</option>
                                                        <option value="pdf">Relatório (PDF)</option>
                                                    </select>
                                                </td>

                                                {/* Disciplina */}
                                                <td className="py-1.5 px-2">
                                                    <Input
                                                        value={doc.disciplina}
                                                        onChange={(e) =>
                                                            handleUpdateDocumentRow(
                                                                idx,
                                                                "disciplina",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Ex: Elétrica"
                                                        className="h-7 text-xs rounded-md border-slate-200"
                                                    />
                                                </td>

                                                {/* Modelo Mestre (Opcional) */}
                                                <td className="py-1.5 px-2">
                                                    <select
                                                        className="flex h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"
                                                        value={doc.escopoId || ""}
                                                        onChange={(e) =>
                                                            handleUpdateDocumentRow(
                                                                idx,
                                                                "escopoId",
                                                                e.target.value ? parseInt(e.target.value) : null
                                                            )
                                                        }
                                                    >
                                                        <option value="">(Sem vínculo direto)</option>
                                                        {escoposDaEmpresa.map((esc: any) => (
                                                            <option key={esc.id} value={esc.id}>
                                                                {esc.disciplina} — {esc.nomeModeloFinal || esc.nomeModelo}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Remover */}
                                                <td className="py-1.5 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveDocumentRow(idx)}
                                                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                                        title="Remover linha"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer com Ações */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500">
                            {validDocumentCount === 0 ? (
                                <span className="text-amber-700 font-semibold">
                                    Preencha o nome de pelo menos 1 documento
                                </span>
                            ) : (
                                <span>
                                    Pronto para cadastrar <strong>{validDocumentCount}</strong> {validDocumentCount === 1 ? "documento" : "documentos"} no pacote <strong>{pacoteData.identificadorEntrega || "sem nome"}</strong>
                                </span>
                            )}
                        </div>

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
                                type="submit"
                                disabled={isPending || validDocumentCount === 0}
                                className="h-8 px-5 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold shadow-xs gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {isPending
                                    ? "Gravando..."
                                    : isNew
                                    ? `Criar Pacote de Entregas (${validDocumentCount})`
                                    : "Salvar Alterações"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            {/* MODAL AUXILIAR 1: SELECIONAR MODELOS DA LISTA MESTRA */}
            {showScopePicker && (
                <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-[#9C1915]" />
                                    Selecionar Modelos da Lista Mestra ({escoposDaEmpresa.length} disponíveis)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Marque os modelos que foram entregues nesta remessa para adicioná-los automaticamente.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowScopePicker(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <span className="text-[11px] font-semibold text-slate-600">
                                    {selectedScopeIds.length} selecionados
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedScopeIds(escoposDaEmpresa.map((e: any) => e.id))}
                                        className="text-[10px] font-bold text-[#9C1915] hover:underline"
                                    >
                                        Selecionar Todos
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedScopeIds([])}
                                        className="text-[10px] font-bold text-slate-500 hover:underline"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {escoposDaEmpresa.map((esc: any) => {
                                    const isChecked = selectedScopeIds.includes(esc.id);
                                    return (
                                        <label
                                            key={esc.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedScopeIds((prev) => [...prev, esc.id]);
                                                    } else {
                                                        setSelectedScopeIds((prev) =>
                                                            prev.filter((id) => id !== esc.id)
                                                        );
                                                    }
                                                }}
                                                className="w-4 h-4 accent-[#9C1915] rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 text-xs">
                                                        {esc.disciplina}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                                        {esc.edificacao}
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] font-mono text-slate-600 truncate">
                                                    {esc.nomeModeloFinal || esc.nomeModelo}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowScopePicker(false)}
                                className="h-8 text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleConfirmScopeSelection}
                                disabled={selectedScopeIds.length === 0}
                                className="h-8 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white"
                            >
                                Adicionar {selectedScopeIds.length} Modelos
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL AUXILIAR 2: COLAR LISTA DE ARQUIVOS EM LOTE */}
            {showPasteModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-blue-600" />
                                    Colar Lista de Arquivos em Lote
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Cole a lista de nomes de arquivos (1 nome por linha)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPasteModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            <Textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder="NEO-23001-AS-ARQ-001-R00&#10;NEO-23001-AS-EST-001-R00&#10;NEO-23001-AS-ELE-001-R00.rvt"
                                className="font-mono text-xs min-h-[160px] rounded-lg border-slate-200 resize-none"
                            />
                            <p className="text-[10px] text-slate-400">
                                Dica: Extensões como .rvt, .ifc, .dwg e .pdf serão identificadas automaticamente.
                            </p>
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPasteModal(false)}
                                className="h-8 text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleConfirmPaste}
                                disabled={!pasteText.trim()}
                                className="h-8 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white"
                            >
                                Inserir Linhas
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
