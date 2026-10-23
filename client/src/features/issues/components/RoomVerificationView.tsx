import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Upload,
    Save,
    Maximize2,
    CheckCircle2,
    Pencil,
    X,
    ExternalLink,
    Loader2,
    ZoomIn,
    Columns2,
    Trash2,
    RefreshCw,
    Image as ImageIcon,
} from "lucide-react";
import { isSameDiscipline, getDisciplineDisplayName } from "../constants";
import { ImageComparisonModal } from "./ImageComparisonModal";

interface RoomVerificationViewProps {
    projectId: string;
    discipline: string;
    sala: any;
    allRoomsInDiscipline: any[];
    onBack: () => void;
    onSelectRoom: (sala: any) => void;
}

export function RoomVerificationView({
    projectId,
    discipline,
    sala,
    allRoomsInDiscipline,
    onBack,
    onSelectRoom,
}: RoomVerificationViewProps) {
    const utils = trpc.useUtils();
    const salaNome = sala?.nome || sala?.salaNome || "";
    const discLabel = getDisciplineDisplayName(discipline);

    // Navegação sequencial
    const currentRoomIdx = allRoomsInDiscipline.findIndex(
        (r) =>
            (r.id && r.id === sala.id) ||
            (r.salaId && r.salaId === (sala.salaId || sala.id)) ||
            (r.nome || r.salaNome) === salaNome
    );

    const prevRoom = currentRoomIdx > 0 ? allRoomsInDiscipline[currentRoomIdx - 1] : null;
    const nextRoom =
        currentRoomIdx >= 0 && currentRoomIdx < allRoomsInDiscipline.length - 1
            ? allRoomsInDiscipline[currentRoomIdx + 1]
            : null;

    // Verificação de conformidade geral da sala
    const { data: verifications = [] } = trpc.dashboard.getVerificacoes.useQuery(
        { salaId: sala?.id || sala?.salaId },
        { enabled: !!(sala?.id || sala?.salaId) }
    );

    // Apontamentos detalhados da sala
    const {
        data: roomApontamentos = [],
        isLoading: loadingIssues,
        refetch: refetchRoomApontamentos,
    } = trpc.dashboard.getApontamentosBySala.useQuery(
        { projectId, sala: salaNome },
        { enabled: !!salaNome && !!projectId }
    );

    const discApontamentos = roomApontamentos.filter((a: any) =>
        isSameDiscipline(a.disciplina, discipline)
    );

    const isSalaConforme =
        verifications.some(
            (v: any) => isSameDiscipline(v.disciplina, discipline) && v.status === "OK"
        ) ||
        (discApontamentos.length > 0 &&
            discApontamentos.every(
                (a: any) => a.status === "RESOLVIDA" || a.status === "SANADA"
            ));

    const upsertMutation = trpc.dashboard.upsertVerificacao.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.dashboard.getVerificacoes.invalidate(),
                utils.dashboard.getSalas.invalidate(),
                utils.dashboard.getKPIs.invalidate(),
            ]);
            toast.success("Status de verificação da sala atualizado!");
        },
    });

    const updateApontamentoMutation = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: async (updatedData: any) => {
            if (updatedData) {
                utils.dashboard.getApontamentosBySala.setData({ projectId, sala: salaNome }, (old: any) => {
                    if (!old) return old;
                    return old.map((a: any) => (a.id === updatedData.id ? { ...a, ...updatedData } : a));
                });
                utils.dashboard.getApontamentos.setData({ projectId }, (old: any) => {
                    if (!old) return old;
                    return old.map((a: any) => (a.id === updatedData.id ? { ...a, ...updatedData } : a));
                });
            }
            await Promise.all([
                utils.dashboard.getApontamentosBySala.invalidate(),
                utils.dashboard.getApontamentos.invalidate(),
                utils.dashboard.getSalas.invalidate(),
                utils.dashboard.getVerificacoes.invalidate(),
                utils.dashboard.getKPIs.invalidate(),
                refetchRoomApontamentos(),
            ]);
            toast.success("Status do apontamento atualizado!");
        },
        onError: (err: any) => {
            toast.error("Erro ao atualizar status: " + (err.message || "Tente novamente."));
            refetchRoomApontamentos();
        },
    });

    const updateAsBuiltMutation = trpc.dashboard.updateApontamentoAsBuilt.useMutation({
        onSuccess: async (updatedData: any) => {
            if (updatedData) {
                utils.dashboard.getApontamentosBySala.setData({ projectId, sala: salaNome }, (old: any) => {
                    if (!old) return old;
                    return old.map((a: any) => (a.id === updatedData.id ? { ...a, ...updatedData } : a));
                });
                utils.dashboard.getApontamentos.setData({ projectId }, (old: any) => {
                    if (!old) return old;
                    return old.map((a: any) => (a.id === updatedData.id ? { ...a, ...updatedData } : a));
                });
            }
            await Promise.all([
                utils.dashboard.getApontamentosBySala.invalidate(),
                utils.dashboard.getApontamentos.invalidate(),
                utils.dashboard.getSalas.invalidate(),
                utils.dashboard.getVerificacoes.invalidate(),
                utils.dashboard.getKPIs.invalidate(),
                refetchRoomApontamentos(),
            ]);
            toast.success("Ajustes As-Built salvos com sucesso!");
            setEditingId(null);
        },
        onError: (err: any) => {
            toast.error("Erro ao salvar detalhes As-Built: " + (err.message || "Tente novamente."));
        },
    });

    // Estados de edição local
    const [editingId, setEditingId] = useState<number | null>(null);
    const [asBuiltNota, setAsBuiltNota] = useState("");
    const [bcfIssueId, setBcfIssueId] = useState("");
    const [asBuiltPrintUrls, setAsBuiltPrintUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

    // Modal de Comparação Lado a Lado
    const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
    const [activeComparisonIssueId, setActiveComparisonIssueId] = useState<number | null>(null);

    const handleOpenComparison = (issueId: number) => {
        setActiveComparisonIssueId(issueId);
        setComparisonModalOpen(true);
    };

    const handleToggleConforme = () => {
        const newStatus = isSalaConforme ? "ATIVA" : "OK";
        const currentVer = verifications.find((v: any) =>
            isSameDiscipline(v.disciplina, discipline)
        );

        upsertMutation.mutate({
            salaId: sala?.id || sala?.salaId,
            disciplina: discipline,
            status: newStatus,
            observacao: currentVer?.observacao || "",
            printUrl: currentVer?.printUrl || "",
        });
    };

    const handleUpdateStatus = (id: number, status: string) => {
        const resolvedDate = status === "RESOLVIDA" || status === "SANADA" ? new Date().toISOString() : null;
        // Atualização otimista imediata para que a UI reflita a mudança sem delay
        utils.dashboard.getApontamentosBySala.setData({ projectId, sala: salaNome }, (old: any) => {
            if (!old) return old;
            return old.map((a: any) => (a.id === id ? { ...a, status, dataResolvido: resolvedDate } : a));
        });
        utils.dashboard.getApontamentos.setData({ projectId }, (old: any) => {
            if (!old) return old;
            return old.map((a: any) => (a.id === id ? { ...a, status, dataResolvido: resolvedDate } : a));
        });

        updateApontamentoMutation.mutate({
            id,
            status,
            dataResolvido: status === "RESOLVIDA" || status === "SANADA" ? new Date() : null,
        });
    };

    const uploadImageFile = async (
        file: File,
        mode: "replace" | "append" = "replace"
    ) => {
        setIsUploading(true);
        try {
            const sanitize = (str: string) =>
                str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z0-9/._-]/g, "_");
            const fileExt = file.name ? file.name.split(".").pop() : "png";
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = sanitize(`apontamentos/real/${fileName}`);

            const { error: uploadError } = await supabase.storage
                .from("project-assets")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("project-assets").getPublicUrl(filePath);

            if (mode === "replace" || asBuiltPrintUrls.length === 0) {
                setAsBuiltPrintUrls([publicUrl]);
                toast.success("Print do Navisworks atualizado com sucesso!");
            } else {
                setAsBuiltPrintUrls((prev) => [...prev, publicUrl]);
                toast.success("Novo print do Navisworks adicionado!");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar imagem.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileInputChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        mode: "replace" | "append" = "replace"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        await uploadImageFile(file, mode);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    await uploadImageFile(file, "replace");
                    break;
                }
            }
        }
    };

    const handleSaveAsBuilt = (id: number, currentStatus?: string) => {
        const payloadUrl =
            asBuiltPrintUrls.length > 0 ? JSON.stringify(asBuiltPrintUrls) : null;

        updateAsBuiltMutation.mutate({
            id,
            asBuiltNota: asBuiltNota || null,
            bcfIssueId: bcfIssueId || null,
            asBuiltPrintUrl: payloadUrl,
            status:
                asBuiltNota || asBuiltPrintUrls.length > 0 || bcfIssueId
                    ? "EM_REVISAO"
                    : currentStatus,
        });
    };

    // Helper para parsear imagens do As-Built
    const parseAsBuiltPrints = (urlStr: string | null): string[] => {
        if (!urlStr) return [];
        try {
            const parsed = JSON.parse(urlStr);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
            if (typeof parsed === "string" && parsed.length > 0) return [parsed];
        } catch {
            if (urlStr.length > 0) return [urlStr];
        }
        return [];
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-150 pb-16 font-sans">
            {/* Top Toolbar: Breadcrumb + Navegação entre salas */}
            <div className="bg-white p-3.5 px-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBack}
                        className="h-8 px-2.5 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 text-xs font-bold"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Lista de Salas
                    </Button>

                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#9C1915] rounded-xs" />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-[#9C1915]">
                                    {discLabel}
                                </span>
                                <span className="text-slate-300 text-xs">•</span>
                                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                                    {salaNome}
                                </h2>
                            </div>
                            <p className="text-[11px] text-[#575756]">
                                {sala?.edificacao} • Pavimento: {sala?.pavimento || "—"} • Código:{" "}
                                {sala?.numeroSala || "—"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navegação Sequencial entre Salas */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!prevRoom}
                        onClick={() => prevRoom && onSelectRoom(prevRoom)}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                        title={prevRoom ? `Ir para: ${prevRoom.nome || prevRoom.salaNome}` : undefined}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Sala Anterior
                    </Button>

                    <span className="text-[11px] font-bold text-slate-500 px-1">
                        {currentRoomIdx + 1} de {allRoomsInDiscipline.length}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!nextRoom}
                        onClick={() => nextRoom && onSelectRoom(nextRoom)}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                        title={nextRoom ? `Ir para: ${nextRoom.nome || nextRoom.salaNome}` : undefined}
                    >
                        Próxima Sala
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Listagem dos Apontamentos com Layout Reestruturado */}
            {loadingIssues ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin text-[#9C1915]" />
                    <p className="text-xs text-slate-500 font-medium">Carregando dados e imagens...</p>
                </div>
            ) : discApontamentos.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase">
                        Nenhum Apontamento Cadastrado
                    </h3>
                    <p className="text-xs text-slate-500">
                        Não existem divergências cadastradas para {discLabel} nesta sala.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {discApontamentos.map((apont: any) => {
                        const isEditing = editingId === apont.id;
                        const asBuiltPrints = parseAsBuiltPrints(apont.asBuiltPrintUrl);

                        return (
                            <div
                                key={apont.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                            >
                                {/* Header do Apontamento: BCF em destaque nítido, sem número interno */}
                                <div className="p-3 px-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {apont.bcfIssueId ? (
                                            <div className="inline-flex items-center gap-1.5 bg-[#9C1915] text-white px-3 py-1 rounded-md shadow-xs">
                                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">ISSUE</span>
                                                <span className="text-sm font-black tracking-wide">
                                                    BCF {apont.bcfIssueId}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold">
                                                Sem BCF
                                            </div>
                                        )}

                                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-2xs">
                                            Responsável: <span className="text-slate-900">{apont.responsavel || "Não atribuído"}</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="h-8 px-3 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white shadow-2xs gap-1.5"
                                            onClick={() => handleOpenComparison(apont.id)}
                                            title="Abrir comparador em tela cheia com ambas as fotos lado a lado"
                                        >
                                            <Columns2 className="w-3.5 h-3.5" />
                                            Comparar Lado a Lado
                                        </Button>

                                        {/* Status Selector Padronizado */}
                                        <select
                                            value={apont.status === "SANADA" ? "RESOLVIDA" : apont.status}
                                            onChange={(e) => handleUpdateStatus(apont.id, e.target.value)}
                                            className={`text-[11px] font-bold uppercase rounded-md px-3 py-1.5 border cursor-pointer focus:outline-none shadow-2xs ${
                                                apont.status === "RESOLVIDA" || apont.status === "SANADA"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                                    : apont.status === "EM_REVISAO"
                                                    ? "bg-amber-50 text-amber-700 border-amber-300"
                                                    : "bg-red-50 text-[#9C1915] border-red-300"
                                            }`}
                                        >
                                            <option value="ATIVA">ATIVA</option>
                                            <option value="EM_REVISAO">EM REVISÃO</option>
                                            <option value="RESOLVIDA">SANADA</option>
                                        </select>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 text-xs font-bold text-slate-700 hover:text-[#9C1915] border-slate-300 shadow-2xs"
                                            onClick={() => {
                                                if (isEditing) {
                                                    setEditingId(null);
                                                } else {
                                                    setEditingId(apont.id);
                                                    setAsBuiltNota(apont.asBuiltNota || "");
                                                    setBcfIssueId(apont.bcfIssueId || "");
                                                    setAsBuiltPrintUrls(asBuiltPrints);
                                                }
                                            }}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mr-1" />
                                            {isEditing ? "Fechar" : "Editar Ajustes"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 space-y-3.5">
                                    {/* DESCRIÇÃO DA DIVERGÊNCIA (CAMPO) - EM DESTAQUE NO TOPO DO CARD */}
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-2.5">
                                        <div className="w-1.5 h-4 bg-[#9C1915] rounded-xs mt-0.5 shrink-0" />
                                        <div className="flex-1 space-y-0.5">
                                            <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wider block">
                                                Descrição da Divergência (Campo)
                                            </span>
                                            <p className="text-xs font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                                                {apont.divergencia || "Sem descrição de divergência registrada."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* BLOCO 1: FOTOS DA DIVERGÊNCIA (OBRA + PROJETO) LADO A LADO EM TAMANHO GRANDE */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {/* Foto da Obra (Executado) */}
                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                                                    Foto da Obra (Executado)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenComparison(apont.id)}
                                                    className="text-[10px] text-slate-500 hover:text-[#9C1915] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <ZoomIn className="w-3 h-3" /> Clique p/ ampliar
                                                </button>
                                            </div>

                                            {apont.fotoUrl ? (
                                                <div
                                                    className="h-72 sm:h-80 lg:h-96 bg-slate-950/5 rounded-lg overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/90 hover:border-[#9C1915] transition-all"
                                                    onClick={() => handleOpenComparison(apont.id)}
                                                    title="Clique para comparar lado a lado com o projeto"
                                                >
                                                    <img
                                                        src={apont.fotoUrl}
                                                        alt="Foto da Obra"
                                                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <span className="bg-black/85 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
                                                            <Columns2 className="w-3.5 h-3.5 text-red-400" />
                                                            Comparar Lado a Lado
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-72 sm:h-80 lg:h-96 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs italic bg-white/50">
                                                    Sem foto da obra cadastrada
                                                </div>
                                            )}
                                        </div>

                                        {/* Modelo de Projeto (Validação RA em Campo) */}
                                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-cyan-600 inline-block" />
                                                    Modelo de Projeto (Validação RA)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenComparison(apont.id)}
                                                    className="text-[10px] text-slate-500 hover:text-[#9C1915] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                >
                                                    <ZoomIn className="w-3 h-3" /> Clique p/ ampliar
                                                </button>
                                            </div>

                                            {apont.fotoReferenciaUrl ? (
                                                <div
                                                    className="h-72 sm:h-80 lg:h-96 bg-slate-950/5 rounded-lg overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/90 hover:border-[#9C1915] transition-all"
                                                    onClick={() => handleOpenComparison(apont.id)}
                                                    title="Clique para comparar lado a lado com a obra"
                                                >
                                                    <img
                                                        src={apont.fotoReferenciaUrl}
                                                        alt="Modelo de Projeto"
                                                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <span className="bg-black/85 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
                                                            <Columns2 className="w-3.5 h-3.5 text-cyan-400" />
                                                            Comparar Lado a Lado
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-72 sm:h-80 lg:h-96 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs italic bg-white/50">
                                                    Sem snapshot do modelo cadastrado
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* BLOCO 2: FOTO DO AS-BUILT (NAVISWORKS) COM O TEXTO DA VERIFICAÇÃO AO LADO */}
                                    {(() => {
                                        const displayPrints = isEditing ? asBuiltPrintUrls : asBuiltPrints;
                                        const hasAnyPrints = displayPrints.length > 0;
                                        const primaryPrintUrl = hasAnyPrints ? displayPrints[displayPrints.length - 1] : null;

                                        if (!hasAnyPrints && !apont.asBuiltNota && !isEditing) return null;

                                        return (
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch pt-2.5 border-t border-slate-100">
                                                {/* Foto do As-Built (Esquerda - 6 colunas, tamanho compacto) */}
                                                <div className="lg:col-span-6 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 flex flex-col">
                                                    <div className="flex items-center justify-between px-0.5">
                                                        <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wide flex items-center gap-1.5">
                                                            <ImageIcon className="w-3 h-3 text-[#9C1915]" />
                                                            Modelo As-Built (Navisworks)
                                                            {isEditing && (
                                                                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1">
                                                                    Em Edição
                                                                </span>
                                                            )}
                                                            {displayPrints.length > 1 && (
                                                                <span className="text-[9px] font-semibold text-slate-500 ml-1">
                                                                    ({displayPrints.length} prints)
                                                                </span>
                                                            )}
                                                        </span>
                                                        {hasAnyPrints && primaryPrintUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setPreviewImage({
                                                                        url: primaryPrintUrl,
                                                                        title: `Modelo As-Built (Navisworks) • BCF ${apont.bcfIssueId || ""}`,
                                                                    })
                                                                }
                                                                className="text-[9px] text-slate-400 hover:text-[#9C1915] font-medium flex items-center gap-0.5 cursor-pointer"
                                                            >
                                                                <ZoomIn className="w-2.5 h-2.5" /> Clique p/ ampliar
                                                            </button>
                                                        )}
                                                    </div>

                                                    {hasAnyPrints && primaryPrintUrl ? (
                                                        <div
                                                            className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                            onClick={() =>
                                                                setPreviewImage({
                                                                    url: primaryPrintUrl,
                                                                    title: `Modelo As-Built (Navisworks) • BCF ${apont.bcfIssueId || ""}`,
                                                                })
                                                            }
                                                            title="Clique para ampliar"
                                                        >
                                                            <img
                                                                src={primaryPrintUrl}
                                                                alt="Modelo As-Built Navisworks"
                                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                            />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="bg-black/70 text-white rounded-full p-1.5 shadow-md">
                                                                    <Maximize2 className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-40 rounded-md border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs flex-1">
                                                            Nenhum print do Navisworks anexado
                                                        </div>
                                                    )}
                                                </div>

                                            {/* Texto da Verificação As-Built / Timeline de Comunicação BCF (Direita - 6 colunas) */}
                                            <div className="lg:col-span-6 bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-start space-y-3">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-3.5 bg-[#9C1915] rounded-xs" />
                                                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                                                            Comunicação & Histórico BCF
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-[#9C1915] uppercase tracking-wider">
                                                        Thread Navisworks ⇄ Revit
                                                    </span>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {(() => {
                                                        const rawText = apont.asBuiltNota || "";
                                                        const lines = rawText.split("\n").filter((l: string) => l.trim().length > 0);
                                                        const parsedComments = lines
                                                            .map((line: string) => {
                                                                const match = line.match(/^\[(.*?)\]:\s*(.*)$/);
                                                                if (match) {
                                                                    return {
                                                                        author: match[1],
                                                                        text: match[2],
                                                                        isStecla: match[1].toLowerCase().includes("stecla"),
                                                                    };
                                                                }
                                                                return null;
                                                            })
                                                            .filter(Boolean);

                                                        if (parsedComments.length > 0) {
                                                            return parsedComments.map((c: any, cIdx: number) => (
                                                                <div
                                                                    key={cIdx}
                                                                    className={`rounded-lg p-2.5 space-y-1 ${
                                                                        c.isStecla
                                                                            ? "bg-red-50/60 border border-red-200"
                                                                            : "bg-amber-50/80 border border-amber-300/90 shadow-2xs"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span
                                                                                className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                                                    c.isStecla
                                                                                        ? "bg-[#9C1915] text-white"
                                                                                        : "bg-amber-600 text-white"
                                                                                }`}
                                                                            >
                                                                                {c.isStecla ? "Stecla (Coordenação)" : `Projetista (${apont.responsavel || "Parceiro"})`}
                                                                            </span>
                                                                            <span className="text-[10px] font-semibold text-slate-700 truncate">
                                                                                {c.author}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs font-medium text-slate-900 leading-relaxed pt-0.5 whitespace-pre-wrap">
                                                                        {c.text}
                                                                    </p>
                                                                </div>
                                                            ));
                                                        }

                                                        // Caso seja texto simples de nota técnica
                                                        return (
                                                            <div className="bg-red-50/60 border border-red-200 rounded-lg p-2.5 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#9C1915] text-white uppercase">
                                                                            Diretriz Stecla
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs font-medium text-slate-800 leading-relaxed pt-0.5 whitespace-pre-wrap">
                                                                    {rawText || "Nenhuma nota técnica de verificação As-Built cadastrada."}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                    {/* Painel de Edição de Ajustes As-Built */}
                                    {isEditing && (
                                        <div
                                            onPaste={handlePaste}
                                            className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3.5 animate-in fade-in"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="sm:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-[#575756]">
                                                        Nota Técnica de Verificação As-Built
                                                    </label>
                                                    <Textarea
                                                        value={asBuiltNota}
                                                        onChange={(e) => setAsBuiltNota(e.target.value)}
                                                        placeholder="Descreva as correções efetuadas no modelo BIM / Navisworks..."
                                                        className="text-xs min-h-[65px] rounded-md bg-white border-slate-200"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-[#575756]">
                                                        Número da Issue BCF
                                                    </label>
                                                    <Input
                                                        value={bcfIssueId}
                                                        onChange={(e) => setBcfIssueId(e.target.value)}
                                                        placeholder="Ex: 4"
                                                        className="text-xs h-8 rounded-md bg-white border-slate-200 font-bold"
                                                    />
                                                </div>
                                            </div>

                                            {/* Gerenciamento de Prints do Navisworks */}
                                            <div className="space-y-2 pt-2 border-t border-slate-200">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold uppercase text-[#575756] flex items-center gap-1.5">
                                                        <ImageIcon className="w-3.5 h-3.5 text-[#9C1915]" />
                                                        Print do Modelo As-Built (Navisworks)
                                                    </label>
                                                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                                                        Dica: Você também pode colar um print diretamente com Ctrl+V
                                                    </span>
                                                </div>

                                                {asBuiltPrintUrls.length > 0 ? (
                                                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center gap-3">
                                                        {asBuiltPrintUrls.map((url, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="relative group w-24 h-20 rounded-md border border-slate-200 overflow-hidden bg-slate-900/5 flex items-center justify-center shrink-0 shadow-2xs"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={`Print Navisworks ${idx + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreviewImage({
                                                                                url,
                                                                                title: `Print Navisworks ${idx + 1}`,
                                                                            })
                                                                        }
                                                                        className="p-1 rounded bg-white/20 hover:bg-white/40 text-white cursor-pointer"
                                                                        title="Visualizar print"
                                                                    >
                                                                        <ZoomIn className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAsBuiltPrintUrls((prev) =>
                                                                                prev.filter((_, i) => i !== idx)
                                                                            );
                                                                            toast.info("Print removido. Clique em 'Salvar Ajustes' para confirmar.");
                                                                        }}
                                                                        className="p-1 rounded bg-red-600/90 hover:bg-red-600 text-white cursor-pointer"
                                                                        title="Excluir este print"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {/* Botão Substituir Print */}
                                                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-md transition-colors shadow-2xs">
                                                                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isUploading ? "animate-spin" : ""}`} />
                                                                {isUploading ? "Enviando..." : "Substituir Print"}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => handleFileInputChange(e, "replace")}
                                                                    disabled={isUploading}
                                                                />
                                                            </label>

                                                            {/* Botão Adicionar Outro */}
                                                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors shadow-2xs">
                                                                <Upload className="w-3 h-3 text-[#9C1915]" />
                                                                Adicionar Outro
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => handleFileInputChange(e, "append")}
                                                                    disabled={isUploading}
                                                                />
                                                            </label>

                                                            {/* Botão Limpar Imagem */}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setAsBuiltPrintUrls([]);
                                                                    toast.info("Print removido. Clique em 'Salvar Ajustes' para confirmar.");
                                                                }}
                                                                className="h-8 px-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Remover Imagem
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-between gap-3">
                                                        <span className="text-xs text-slate-400 italic">
                                                            Nenhum print do Navisworks anexado.
                                                        </span>
                                                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#9C1915] hover:bg-[#7D1411] px-3.5 py-1.5 rounded-md transition-colors shadow-xs">
                                                            <Upload className="w-3.5 h-3.5" />
                                                            {isUploading ? "Carregando..." : "Subir Print do Navisworks"}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleFileInputChange(e, "replace")}
                                                                disabled={isUploading}
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Botão de Salvar Ajustes */}
                                            <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-5 text-xs font-bold rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white shadow-2xs gap-1.5 cursor-pointer"
                                                    onClick={() => handleSaveAsBuilt(apont.id, apont.status)}
                                                    disabled={updateAsBuiltMutation.isPending || isUploading}
                                                >
                                                    {updateAsBuiltMutation.isPending ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    Salvar Ajustes
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Comparação Lado a Lado em Alta Resolução */}
            <ImageComparisonModal
                isOpen={comparisonModalOpen}
                onClose={() => setComparisonModalOpen(false)}
                issues={discApontamentos}
                activeIssueId={activeComparisonIssueId}
                onSelectIssueId={(id) => setActiveComparisonIssueId(id)}
                disciplineLabel={discLabel}
                roomName={salaNome}
            />

            {/* Modal de Zoom da Imagem */}
            {previewImage && (
                <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <DialogContent className="max-w-4xl p-2 bg-black/95 border-none rounded-xl text-white">
                        <div className="relative flex flex-col items-center justify-center p-2">
                            <div className="w-full flex justify-between items-center px-2 py-1 text-white text-xs mb-2">
                                <span className="font-bold">{previewImage.title}</span>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-h-[85vh] max-w-full object-contain rounded"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
