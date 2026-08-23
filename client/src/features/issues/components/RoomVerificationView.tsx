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
} from "lucide-react";
import { isSameDiscipline, getDisciplineDisplayName } from "../constants";

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
    const { data: roomApontamentos = [], isLoading: loadingIssues } =
        trpc.dashboard.getApontamentosBySala.useQuery(
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
        onSuccess: () => {
            utils.dashboard.getVerificacoes.invalidate({ salaId: sala?.id || sala?.salaId });
            utils.dashboard.getSalas.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            toast.success("Status de verificação da sala atualizado!");
        },
    });

    const updateApontamentoMutation = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: () => {
            utils.dashboard.getApontamentosBySala.invalidate({ projectId, sala: salaNome });
            utils.dashboard.getApontamentos.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            toast.success("Status do apontamento atualizado!");
        },
    });

    const updateAsBuiltMutation = trpc.dashboard.updateApontamentoAsBuilt.useMutation({
        onSuccess: () => {
            toast.success("Ajustes As-Built salvos com sucesso!");
            utils.dashboard.getApontamentosBySala.invalidate({ projectId, sala: salaNome });
            utils.dashboard.getApontamentos.invalidate({ projectId });
            setEditingId(null);
        },
        onError: () => {
            toast.error("Erro ao salvar detalhes As-Built.");
        },
    });

    // Estados de edição local
    const [editingId, setEditingId] = useState<number | null>(null);
    const [asBuiltNota, setAsBuiltNota] = useState("");
    const [bcfIssueId, setBcfIssueId] = useState("");
    const [asBuiltPrintUrls, setAsBuiltPrintUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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
        updateApontamentoMutation.mutate({
            id,
            status,
            dataResolvido: status === "RESOLVIDA" || status === "SANADA" ? new Date() : null,
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const sanitize = (str: string) =>
                str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z0-9/._-]/g, "_");
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = sanitize(`apontamentos/real/${fileName}`);

            const { error: uploadError } = await supabase.storage
                .from("project-assets")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("project-assets").getPublicUrl(filePath);

            setAsBuiltPrintUrls((prev) => [...prev, publicUrl]);
            toast.success("Print do Navisworks anexado!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar imagem.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveAsBuilt = (id: number, currentStatus?: string) => {
        updateAsBuiltMutation.mutate({
            id,
            asBuiltNota: asBuiltNota,
            bcfIssueId: bcfIssueId,
            asBuiltPrintUrl: JSON.stringify(asBuiltPrintUrls),
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
                                    {/* BLOCO 1: FOTOS DA DIVERGÊNCIA (OBRA + RA) COM O TEXTO AO LADO */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                                        {/* Fotos da Divergência (Esquerda - 7 colunas, tamanho compacto) */}
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

                                                {apont.fotoUrl ? (
                                                    <div
                                                        className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                        onClick={() => setPreviewImage({ url: apont.fotoUrl, title: `Foto da Obra (Executado) • BCF ${apont.bcfIssueId || ""}` })}
                                                        title="Clique para ampliar"
                                                    >
                                                        <img
                                                            src={apont.fotoUrl}
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

                                                {apont.fotoReferenciaUrl ? (
                                                    <div
                                                        className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                        onClick={() => setPreviewImage({ url: apont.fotoReferenciaUrl, title: `Modelo de Projeto (Validação RA) • BCF ${apont.bcfIssueId || ""}` })}
                                                        title="Clique para ampliar"
                                                    >
                                                        <img
                                                            src={apont.fotoReferenciaUrl}
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

                                        {/* Texto da Divergência de Campo (Direita - 5 colunas) */}
                                        <div className="lg:col-span-5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-start space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-3 bg-[#9C1915] rounded-xs" />
                                                <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wider">
                                                    Descrição da Divergência (Campo)
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                                                {apont.divergencia || "Sem descrição de divergência registrada."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* BLOCO 2: FOTO DO AS-BUILT (NAVISWORKS) COM O TEXTO DA VERIFICAÇÃO AO LADO */}
                                    {(asBuiltPrints.length > 0 || apont.asBuiltNota || isEditing) && (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch pt-2.5 border-t border-slate-100">
                                            {/* Foto do As-Built (Esquerda - 6 colunas, tamanho compacto) */}
                                            <div className="lg:col-span-6 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 flex flex-col">
                                                <div className="flex items-center justify-between px-0.5">
                                                    <span className="text-[10px] font-bold uppercase text-[#575756] tracking-wide">
                                                        Modelo As-Built (Navisworks)
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                                        <ZoomIn className="w-2.5 h-2.5" /> Clique p/ ampliar
                                                    </span>
                                                </div>

                                                {asBuiltPrints.length > 0 ? (
                                                    <div
                                                        className="h-40 bg-slate-900/5 rounded-md overflow-hidden cursor-zoom-in relative group flex items-center justify-center border border-slate-200/80 hover:border-[#9C1915] transition-all"
                                                        onClick={() => setPreviewImage({ url: asBuiltPrints[0], title: `Modelo As-Built (Navisworks) • BCF ${apont.bcfIssueId || ""}` })}
                                                        title="Clique para ampliar"
                                                    >
                                                        <img
                                                            src={asBuiltPrints[0]}
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
                                    )}

                                    {/* Painel de Edição de Ajustes As-Built */}
                                    {isEditing && (
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 animate-in fade-in">
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
                                                        placeholder="Ex: 62"
                                                        className="text-xs h-8 rounded-md bg-white border-slate-200 font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors shadow-xs">
                                                    <Upload className="w-3.5 h-3.5 text-[#9C1915]" />
                                                    {isUploading ? "Carregando..." : "Subir Print do Navisworks"}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleFileUpload}
                                                        disabled={isUploading}
                                                    />
                                                </label>

                                                <Button
                                                    size="sm"
                                                    className="h-8 px-4 text-xs font-bold rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white"
                                                    onClick={() => handleSaveAsBuilt(apont.id, apont.status)}
                                                    disabled={updateAsBuiltMutation.isPending}
                                                >
                                                    <Save className="w-3.5 h-3.5 mr-1.5" />
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

            {/* Lightbox / Modal de Zoom em Alta Resolução */}
            {previewImage && (
                <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <DialogContent className="max-w-6xl p-0 bg-black/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                        {/* Header do Lightbox */}
                        <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10 text-white">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                {previewImage.title || "Visualização de Imagem"}
                            </span>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewImage.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Abrir imagem em nova aba"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500 text-white transition-colors"
                                    title="Fechar (Esc)"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Imagem Ampliada */}
                        <div
                            className="p-4 flex items-center justify-center max-h-[82vh] overflow-auto cursor-zoom-out"
                            onClick={() => setPreviewImage(null)}
                        >
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-h-[78vh] max-w-full object-contain rounded-lg shadow-lg select-none"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
