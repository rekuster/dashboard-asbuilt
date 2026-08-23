import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Camera,
    Sparkles,
    Eye,
    Save,
    Loader2,
    X,
    ExternalLink,
    Maximize2,
    ZoomIn,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { isSameDiscipline } from "@/features/issues/constants";

interface RoomData {
    sala: string;
    numeroSala?: string;
    edificacao: string;
    pavimento?: string;
    setor?: string;
    total: number;
    ativas: number;
    emRevisao: number;
    sanadas: number;
    status: "CONFORME" | "EM_REVISAO" | "ATIVA" | "PENDENTE";
    apontamentos: any[];
}

interface DesignerRoomResolutionViewProps {
    projectId: string;
    room: RoomData;
    disciplineSigla: string;
    disciplineDisplayName: string;
    responsavel: string;
    disciplinesConfig?: any[];
    allRooms: RoomData[];
    onBack: () => void;
    onNavigateRoom: (newRoom: RoomData) => void;
}

export function DesignerRoomResolutionView({
    projectId,
    room,
    disciplineSigla,
    disciplineDisplayName,
    responsavel,
    disciplinesConfig,
    allRooms,
    onBack,
    onNavigateRoom,
}: DesignerRoomResolutionViewProps) {
    const utils = trpc.useUtils();

    // Query para carregar os apontamentos com imagens completas da sala
    const { data: fullApontamentos = [], isLoading: loadingIssues } =
        trpc.dashboard.getApontamentosBySala.useQuery(
            { projectId, sala: room.sala },
            { enabled: !!projectId && !!room.sala }
        );

    // Estados para edição / resposta
    const [editingIssueId, setEditingIssueId] = useState<number | null>(null);
    const [asBuiltNote, setAsBuiltNote] = useState("");
    const [asBuiltPrintUrl, setAsBuiltPrintUrl] = useState("");
    const [saving, setSaving] = useState(false);

    // Lightbox modal para zoom de imagem em tela cheia
    const [activeZoomImage, setActiveZoomImage] = useState<{ url: string; title: string } | null>(null);

    // Mutação para salvar comentário/print do projetista (SEM alterar status arbitrariamente)
    const updateIssueMutation = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: () => {
            toast.success("Justificativa técnica e print registrados com sucesso!");
            utils.dashboard.getApontamentosBySala.invalidate({ projectId, sala: room.sala });
            utils.dashboard.getApontamentos.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            setEditingIssueId(null);
            setSaving(false);
        },
        onError: (err: any) => {
            toast.error("Erro ao salvar: " + err.message);
            setSaving(false);
        },
    });

    // Índice da sala atual na lista de navegação
    const currentRoomIndex = allRooms.findIndex((r) => r.sala === room.sala);
    const prevRoom = currentRoomIndex > 0 ? allRooms[currentRoomIndex - 1] : null;
    const nextRoom = currentRoomIndex < allRooms.length - 1 ? allRooms[currentRoomIndex + 1] : null;

    // FILTRO RIGOROSO POR DISCIPLINA
    const rawList = fullApontamentos.length > 0 ? fullApontamentos : room.apontamentos || [];
    const issuesToDisplay = rawList.filter((a: any) =>
        isSameDiscipline(a.disciplina, disciplineSigla, disciplinesConfig)
    );

    const handleStartResolution = (issue: any) => {
        setEditingIssueId(issue.id);
        setAsBuiltNote(issue.asBuiltNota || issue.asBuiltTexto || issue.descricao || "");
        setAsBuiltPrintUrl(issue.asBuiltPrintUrl || "");
    };

    const handleSaveResolution = (issueId: number) => {
        setSaving(true);
        updateIssueMutation.mutate({
            id: issueId,
            asBuiltNota: asBuiltNote.trim() || undefined,
            asBuiltTexto: asBuiltNote.trim() || undefined,
            asBuiltPrintUrl: asBuiltPrintUrl.trim() || undefined,
        });
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-150">
            {/* Top Toolbar de Navegação entre Salas */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onBack}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-50 gap-1.5"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#9C1915]" />
                        Salas de {disciplineSigla}
                    </Button>

                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                {room.sala}
                            </h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-[#9C1915] border border-red-200">
                                {disciplineSigla}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                Resp: {responsavel || "Stecla"}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            {room.edificacao} {room.pavimento ? `• ${room.pavimento}` : ""}
                        </p>
                    </div>
                </div>

                {/* Navegação Sequencial Anterior / Próxima */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">
                        Sala {currentRoomIndex + 1} de {allRooms.length}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!prevRoom}
                        onClick={() => prevRoom && onNavigateRoom(prevRoom)}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Anterior
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!nextRoom}
                        onClick={() => nextRoom && onNavigateRoom(nextRoom)}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                    >
                        Próxima
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Listagem de Issues / Apontamentos da Sala */}
            {loadingIssues ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#9C1915] mb-2" />
                    Carregando evidências e histórico da sala...
                </div>
            ) : issuesToDisplay.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 italic">
                    Nenhum apontamento desta disciplina ({disciplineSigla}) nesta sala.
                </div>
            ) : (
                <div className="space-y-4">
                    {issuesToDisplay.map((issue: any) => {
                        const isEditing = editingIssueId === issue.id;
                        const bcfNum = issue.bcfIssueId || issue.numeroBcf || (typeof issue.bcfId === "number" || (typeof issue.bcfId === "string" && issue.bcfId.trim() !== "") ? issue.bcfId : null);
                        const isConforme = issue.status === "SANADA" || issue.status === "RESOLVIDA";
                        const isRevisao = issue.status === "EM_REVISAO";

                        return (
                            <Card
                                key={issue.id}
                                className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden"
                            >
                                {/* Header da Issue */}
                                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        {bcfNum ? (
                                            <span className="font-mono font-black text-xs bg-[#9C1915] text-white px-2.5 py-0.5 rounded shadow-2xs">
                                                BCF {bcfNum}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                                Sem BCF (Aguardando Verificação)
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-slate-800">
                                            {disciplineDisplayName}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            Resp: {issue.responsavel || responsavel || "Stecla"}
                                        </span>
                                    </div>

                                    {/* Status Badge e Botão de Ação */}
                                    <div className="flex items-center gap-2">
                                        {isConforme ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Sanada / Aprovada
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                <Clock className="w-3 h-3" />
                                                Ajustar As Built
                                            </span>
                                        )}

                                        {!isEditing && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleStartResolution(issue)}
                                                className="h-7 px-3 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1 shadow-2xs"
                                            >
                                                <span>Responder / Justificar</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-4 space-y-4">
                                    {/* BLOCO 1: EVIDÊNCIAS DE CAMPO (FOTO OBRA + MODELO RA) & DESCRIÇÃO DA DIVERGÊNCIA */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                                        {/* Fotos da Divergência (Esquerda - 7 colunas, tamanho e proporção padrão Apontamentos) */}
                                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {/* Foto da Obra (Executado) */}
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 flex flex-col">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wide">
                                                        Foto da Obra (Executado)
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                                        <ZoomIn className="w-2.5 h-2.5" /> Clique p/ ampliar
                                                    </span>
                                                </div>

                                                {issue.fotoUrl ? (
                                                    <div
                                                        className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                        onClick={() =>
                                                            setActiveZoomImage({
                                                                url: issue.fotoUrl,
                                                                title: `Foto da Obra (Executado) • ${bcfNum ? `BCF ${bcfNum}` : disciplineDisplayName}`,
                                                            })
                                                        }
                                                        title="Clique para ampliar"
                                                    >
                                                        <img
                                                            src={issue.fotoUrl}
                                                            alt="Foto da Obra"
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
                                                        Sem foto da obra cadastrada
                                                    </div>
                                                )}
                                            </div>

                                            {/* Modelo de Projeto (Validação RA em Campo) */}
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 flex flex-col">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wide">
                                                        Modelo de Projeto (Validação RA)
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                                        <ZoomIn className="w-2.5 h-2.5" /> Clique p/ ampliar
                                                    </span>
                                                </div>

                                                {issue.fotoReferenciaUrl ? (
                                                    <div
                                                        className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                        onClick={() =>
                                                            setActiveZoomImage({
                                                                url: issue.fotoReferenciaUrl,
                                                                title: `Modelo de Projeto (Validação RA) • ${bcfNum ? `BCF ${bcfNum}` : disciplineDisplayName}`,
                                                            })
                                                        }
                                                        title="Clique para ampliar"
                                                    >
                                                        <img
                                                            src={issue.fotoReferenciaUrl}
                                                            alt="Modelo de Projeto"
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
                                                        Sem snapshot do modelo cadastrado
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Descrição da Divergência de Campo (Direita - 5 colunas) */}
                                        <div className="lg:col-span-5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-start space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-3 bg-[#9C1915] rounded-xs" />
                                                <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wider">
                                                    Descrição da Divergência (Campo)
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                                                {issue.divergencia || issue.descricao || "Sem descrição de divergência registrada."}
                                            </p>
                                            <span className="text-[9px] text-slate-400 font-medium pt-2">
                                                Registrado pela equipe de vistoria Stecla
                                            </span>
                                        </div>
                                    </div>

                                    {/* BLOCO 2: FOTO DO AS-BUILT (NAVISWORKS) & NOTA TÉCNICA */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch pt-2.5 border-t border-slate-100">
                                        {/* Foto do As-Built (Esquerda - 6 colunas) */}
                                        <div className="lg:col-span-6 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 flex flex-col">
                                            <div className="flex items-center justify-between px-0.5">
                                                <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wide">
                                                    Modelo As-Built (Navisworks)
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                                    <ZoomIn className="w-2.5 h-2.5" /> Clique p/ ampliar
                                                </span>
                                            </div>

                                            {issue.asBuiltPrintUrl ? (
                                                <div
                                                    className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                    onClick={() =>
                                                        setActiveZoomImage({
                                                            url: issue.asBuiltPrintUrl,
                                                            title: `Modelo As-Built (Navisworks) • ${bcfNum ? `BCF ${bcfNum}` : disciplineDisplayName}`,
                                                        })
                                                    }
                                                    title="Clique para ampliar"
                                                >
                                                    <img
                                                        src={issue.asBuiltPrintUrl}
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
                                                    <Camera className="w-5 h-5 mx-auto mb-1 opacity-40" />
                                                    Aguardando anexo do print As-Built
                                                </div>
                                            )}
                                        </div>

                                        {/* Nota Técnica de Verificação / Resolução (Direita - 6 colunas) */}
                                        <div className="lg:col-span-6 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-start space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-3 bg-slate-600 rounded-xs" />
                                                <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wider">
                                                    Nota Técnica de Verificação & Resolução As-Built
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                                                {issue.asBuiltNota || issue.asBuiltTexto || (
                                                    <span className="text-slate-400 font-normal italic">
                                                        Nenhuma nota técnica registrada. Clique em "Responder / Justificar" para registrar seu comentário.
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* FORMULÁRIO DE RESPOSTA DO PROJETISTA (SEM ALTERAR STATUS) */}
                                    {isEditing && (
                                        <div className="bg-red-50/40 border border-red-200 rounded-xl p-4 space-y-3.5 animate-in fade-in duration-150">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-[#9C1915]" />
                                                    <span className="text-xs font-bold uppercase text-slate-800">
                                                        Registrar Justificativa Técnica / Ajuste Modelado
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setEditingIssueId(null)}
                                                    className="text-slate-400 hover:text-slate-600 text-xs"
                                                >
                                                    ✕ Cancelar
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="sm:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">
                                                        Comentário / Justificativa Técnica *
                                                    </label>
                                                    <textarea
                                                        value={asBuiltNote}
                                                        onChange={(e) => setAsBuiltNote(e.target.value)}
                                                        placeholder="Ex: Ajustada cota da tubulação no modelo 3D conforme executado na foto de campo."
                                                        rows={3}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#9C1915] resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">
                                                        URL do Print do Modelo (Opcional)
                                                    </label>
                                                    <input
                                                        value={asBuiltPrintUrl}
                                                        onChange={(e) => setAsBuiltPrintUrl(e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#9C1915]"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        O status da divergência será revalidado e homologado pela Stecla.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-100">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingIssueId(null)}
                                                    className="h-8 px-3 text-xs font-bold"
                                                >
                                                    Cancelar
                                                </Button>

                                                <Button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => handleSaveResolution(issue.id)}
                                                    size="sm"
                                                    className="h-8 px-4 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-xs"
                                                >
                                                    {saving ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    Salvar Justificativa Técnica
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* LIGHTBOX DE ALTA RESOLUÇÃO / ZOOM DE FOTO EM TELA CHEIA */}
            {activeZoomImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
                    onClick={() => setActiveZoomImage(null)}
                >
                    <div
                        className="relative max-w-5xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Lightbox */}
                        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">
                                {activeZoomImage.title}
                            </span>
                            <div className="flex items-center gap-2">
                                <a
                                    href={activeZoomImage.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    title="Abrir em Nova Aba"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => setActiveZoomImage(null)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    title="Fechar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Imagem Ampliada */}
                        <div className="p-2 flex items-center justify-center max-h-[80vh] overflow-hidden bg-slate-950">
                            <img
                                src={activeZoomImage.url}
                                alt="Visualização Ampliada"
                                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
