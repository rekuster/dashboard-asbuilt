import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    X,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Columns2,
    Eye,
    ZoomIn,
    Maximize2,
    Minimize2,
    Camera,
    Box,
    Layers,
    Copy,
    Check,
} from "lucide-react";
import { toast } from "sonner";

export interface ComparisonIssueItem {
    id: number;
    bcfIssueId?: string | null;
    responsavel?: string | null;
    disciplina?: string | null;
    sala?: string | null;
    divergencia?: string | null;
    fotoUrl?: string | null;
    fotoReferenciaUrl?: string | null;
    asBuiltPrintUrl?: string | null;
    status?: string | null;
}

interface ImageComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    issues: ComparisonIssueItem[];
    activeIssueId: number | null;
    onSelectIssueId?: (id: number) => void;
    disciplineLabel?: string;
    roomName?: string;
}

export function ImageComparisonModal({
    isOpen,
    onClose,
    issues,
    activeIssueId,
    onSelectIssueId,
    disciplineLabel,
    roomName,
}: ImageComparisonModalProps) {
    const [viewMode, setViewMode] = useState<"split" | "obra" | "projeto" | "asbuilt">("split");
    const [zoomFit, setZoomFit] = useState<"contain" | "original">("contain");
    const [copied, setCopied] = useState(false);

    const currentIndex = issues.findIndex((i) => i.id === activeIssueId);
    const activeIssue = currentIndex >= 0 ? issues[currentIndex] : issues[0];

    // Parse As-Built prints
    const asBuiltPrints: string[] = React.useMemo(() => {
        if (!activeIssue?.asBuiltPrintUrl) return [];
        try {
            const parsed = JSON.parse(activeIssue.asBuiltPrintUrl);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
            if (typeof parsed === "string" && parsed.length > 0) return [parsed];
        } catch {
            if (activeIssue.asBuiltPrintUrl.length > 0) return [activeIssue.asBuiltPrintUrl];
        }
        return [];
    }, [activeIssue?.asBuiltPrintUrl]);

    const hasObra = !!activeIssue?.fotoUrl;
    const hasProjeto = !!activeIssue?.fotoReferenciaUrl;
    const hasAsBuilt = asBuiltPrints.length > 0;

    // Navegação entre apontamentos
    const handlePrev = useCallback(() => {
        if (currentIndex > 0 && onSelectIssueId) {
            onSelectIssueId(issues[currentIndex - 1].id);
        }
    }, [currentIndex, issues, onSelectIssueId]);

    const handleNext = useCallback(() => {
        if (currentIndex < issues.length - 1 && onSelectIssueId) {
            onSelectIssueId(issues[currentIndex + 1].id);
        }
    }, [currentIndex, issues, onSelectIssueId]);

    // Atalhos de teclado (Esc, Setas)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "ArrowRight") {
                handleNext();
            } else if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handlePrev, handleNext, onClose]);

    if (!isOpen || !activeIssue) return null;

    const copyDivergencia = () => {
        if (activeIssue.divergencia) {
            navigator.clipboard.writeText(activeIssue.divergencia);
            setCopied(true);
            toast.success("Descrição copiada para a área de transferência!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh] p-0 bg-slate-950/98 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 font-sans z-50">
                {/* 1. Header Principal do Modal */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-black/60 border-b border-white/10 select-none shrink-0">
                    {/* Identificação: BCF + Sala + Disciplina */}
                    <div className="flex items-center gap-3">
                        {activeIssue.bcfIssueId ? (
                            <div className="inline-flex items-center gap-1.5 bg-[#9C1915] text-white px-3 py-1 rounded-md shadow-xs font-bold text-xs tracking-wider uppercase">
                                <span>BCF {activeIssue.bcfIssueId}</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">
                                Sem BCF
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <span className="font-bold text-white uppercase">
                                {disciplineLabel || activeIssue.disciplina || "Disciplina"}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-200 font-medium">
                                {roomName || activeIssue.sala || "Sala"}
                            </span>
                        </div>

                        {activeIssue.status && (
                            <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    activeIssue.status === "RESOLVIDA" || activeIssue.status === "SANADA"
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : activeIssue.status === "EM_REVISAO"
                                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                                }`}
                            >
                                {activeIssue.status}
                            </span>
                        )}
                    </div>

                    {/* Alternador de Modo de Visão */}
                    <div className="inline-flex items-center bg-slate-900/90 border border-white/10 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("split")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-colors ${
                                viewMode === "split"
                                    ? "bg-[#9C1915] text-white shadow-xs"
                                    : "text-slate-300 hover:text-white hover:bg-white/5"
                            }`}
                            title="Ver Obra e Projeto lado a lado"
                        >
                            <Columns2 className="w-3.5 h-3.5" />
                            Lado a Lado (Comparação)
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode("obra")}
                            disabled={!hasObra}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                viewMode === "obra"
                                    ? "bg-[#9C1915] text-white shadow-xs"
                                    : "text-slate-300 hover:text-white hover:bg-white/5"
                            }`}
                            title="Apenas Foto da Obra"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            Obra
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode("projeto")}
                            disabled={!hasProjeto}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                viewMode === "projeto"
                                    ? "bg-[#9C1915] text-white shadow-xs"
                                    : "text-slate-300 hover:text-white hover:bg-white/5"
                            }`}
                            title="Apenas Modelo de Projeto (RA)"
                        >
                            <Box className="w-3.5 h-3.5" />
                            Projeto (RA)
                        </button>

                        {hasAsBuilt && (
                            <button
                                type="button"
                                onClick={() => setViewMode("asbuilt")}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-colors ${
                                    viewMode === "asbuilt"
                                        ? "bg-[#9C1915] text-white shadow-xs"
                                        : "text-slate-300 hover:text-white hover:bg-white/5"
                                }`}
                                title="Print do Modelo As-Built Navisworks"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Navisworks
                            </button>
                        )}
                    </div>

                    {/* Controles de Navegação Sequencial e Fechar */}
                    <div className="flex items-center gap-2">
                        {issues.length > 1 && (
                            <div className="flex items-center gap-1 bg-slate-900/90 border border-white/10 rounded-lg p-0.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={currentIndex <= 0}
                                    onClick={handlePrev}
                                    className="h-7 px-2 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30"
                                    title="Divergência anterior (Seta esquerda)"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-[11px] font-bold text-slate-300 px-1">
                                    {currentIndex + 1} de {issues.length}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={currentIndex >= issues.length - 1}
                                    onClick={handleNext}
                                    className="h-7 px-2 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30"
                                    title="Próxima divergência (Seta direita)"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setZoomFit((prev) => (prev === "contain" ? "original" : "contain"))}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title={zoomFit === "contain" ? "Tamanho Real (100%)" : "Ajustar à Tela"}
                        >
                            {zoomFit === "contain" ? (
                                <ZoomIn className="w-4 h-4" />
                            ) : (
                                <Minimize2 className="w-4 h-4" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white transition-colors"
                            title="Fechar (Esc)"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 2. Área Central de Imagens */}
                <div className="flex-1 p-3 overflow-hidden bg-black/40">
                    {viewMode === "split" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                            {/* Painel Esquerdo: FOTO DA OBRA */}
                            <div className="flex flex-col bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden shadow-inner">
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-white/10 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                                            <Camera className="w-3.5 h-3.5 text-red-400" />
                                            Foto da Obra (Executado)
                                        </span>
                                    </div>
                                    {activeIssue.fotoUrl && (
                                        <a
                                            href={activeIssue.fotoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                                            title="Abrir foto em nova aba"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Nova Aba
                                        </a>
                                    )}
                                </div>

                                <div className="flex-1 flex items-center justify-center p-2 overflow-auto bg-black/30">
                                    {activeIssue.fotoUrl ? (
                                        <img
                                            src={activeIssue.fotoUrl}
                                            alt="Foto da Obra"
                                            className={`max-w-full rounded-md shadow-lg select-none transition-all ${
                                                zoomFit === "contain"
                                                    ? "max-h-[66vh] object-contain"
                                                    : "max-h-none object-none"
                                            }`}
                                        />
                                    ) : (
                                        <div className="text-slate-500 text-xs italic flex flex-col items-center gap-1">
                                            <Camera className="w-6 h-6 opacity-40" />
                                            Sem foto da obra cadastrada
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Painel Direito: MODELO DE PROJETO */}
                            <div className="flex flex-col bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden shadow-inner">
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-white/10 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                                            <Box className="w-3.5 h-3.5 text-cyan-400" />
                                            Modelo de Projeto (Validação RA)
                                        </span>
                                    </div>
                                    {activeIssue.fotoReferenciaUrl && (
                                        <a
                                            href={activeIssue.fotoReferenciaUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                                            title="Abrir modelo RA em nova aba"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Nova Aba
                                        </a>
                                    )}
                                </div>

                                <div className="flex-1 flex items-center justify-center p-2 overflow-auto bg-black/30">
                                    {activeIssue.fotoReferenciaUrl ? (
                                        <img
                                            src={activeIssue.fotoReferenciaUrl}
                                            alt="Modelo de Projeto (RA)"
                                            className={`max-w-full rounded-md shadow-lg select-none transition-all ${
                                                zoomFit === "contain"
                                                    ? "max-h-[66vh] object-contain"
                                                    : "max-h-none object-none"
                                            }`}
                                        />
                                    ) : (
                                        <div className="text-slate-500 text-xs italic flex flex-col items-center gap-1">
                                            <Box className="w-6 h-6 opacity-40" />
                                            Sem snapshot do projeto RA cadastrado
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Painel de Visualização Individual em Tela Cheia */
                        <div className="flex flex-col bg-slate-900/60 rounded-xl border border-white/10 h-full overflow-hidden shadow-inner">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-white/10 shrink-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                    {viewMode === "obra"
                                        ? "Foto da Obra (Executado)"
                                        : viewMode === "projeto"
                                        ? "Modelo de Projeto (Validação RA)"
                                        : "Modelo As-Built (Navisworks)"}
                                </span>

                                {(() => {
                                    const currentUrl =
                                        viewMode === "obra"
                                            ? activeIssue.fotoUrl
                                            : viewMode === "projeto"
                                            ? activeIssue.fotoReferenciaUrl
                                            : asBuiltPrints[0];
                                    return (
                                        currentUrl && (
                                            <a
                                                href={currentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Abrir em Nova Aba
                                            </a>
                                        )
                                    );
                                })()}
                            </div>

                            <div className="flex-1 flex items-center justify-center p-2 overflow-auto bg-black/30">
                                {(() => {
                                    const currentUrl =
                                        viewMode === "obra"
                                            ? activeIssue.fotoUrl
                                            : viewMode === "projeto"
                                            ? activeIssue.fotoReferenciaUrl
                                            : asBuiltPrints[0];

                                    if (!currentUrl) {
                                        return (
                                            <div className="text-slate-500 text-xs italic">
                                                Nenhuma imagem disponível nesta visualização
                                            </div>
                                        );
                                    }

                                    return (
                                        <img
                                            src={currentUrl}
                                            alt="Visualização ampliada"
                                            className={`max-w-full rounded-md shadow-lg select-none transition-all ${
                                                zoomFit === "contain"
                                                    ? "max-h-[68vh] object-contain"
                                                    : "max-h-none object-none"
                                            }`}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Rodapé do Modal com a Descrição da Divergência */}
                <div className="px-5 py-2.5 bg-black/75 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span className="text-[10px] font-black uppercase text-red-400 bg-red-950/70 border border-red-800/60 px-2 py-0.5 rounded shrink-0">
                            Divergência
                        </span>
                        <p className="text-xs text-slate-200 font-medium truncate" title={activeIssue.divergencia || ""}>
                            {activeIssue.divergencia || "Sem descrição registrada para este apontamento."}
                        </p>
                        {activeIssue.divergencia && (
                            <button
                                type="button"
                                onClick={copyDivergencia}
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                                title="Copiar descrição"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-3">
                        <span>
                            Navegação: <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 text-white">←</kbd> / <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 text-white">→</kbd>
                        </span>
                        <span>
                            Fechar: <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 text-white">Esc</kbd>
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
