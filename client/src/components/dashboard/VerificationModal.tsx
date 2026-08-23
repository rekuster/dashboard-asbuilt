import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    Upload,
    Pencil,
    Eye,
    Maximize2,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import { isSameDiscipline } from "@/features/issues/constants";

interface VerificationModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    sala: any;
    disciplines: string[];
    pendingApontamentos?: Record<string, number>;
}

export function VerificationModal({
    projectId,
    isOpen,
    onClose,
    sala,
    disciplines,
}: VerificationModalProps) {
    const utils = trpc.useUtils();
    const salaNome = sala?.nome || sala?.salaNome || "";

    const { data: verifications = [] } = trpc.dashboard.getVerificacoes.useQuery(
        { salaId: sala?.id || sala?.salaId },
        { enabled: !!(sala?.id || sala?.salaId) }
    );

    // Busca detalhada dos apontamentos DESTA SALA com as fotos completas
    const { data: roomApontamentos = [] } = trpc.dashboard.getApontamentosBySala.useQuery(
        { projectId, sala: salaNome },
        { enabled: !!salaNome && !!projectId && isOpen }
    );

    const upsertMutation = trpc.dashboard.upsertVerificacao.useMutation({
        onSuccess: () => {
            utils.dashboard.getVerificacoes.invalidate({ salaId: sala?.id || sala?.salaId });
            utils.dashboard.getSalas.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            toast.success("Status de verificação atualizado!");
        },
    });

    const [editingApontamentoId, setEditingApontamentoId] = useState<number | null>(null);
    const [asBuiltNota, setAsBuiltNota] = useState("");
    const [asBuiltPrintUrls, setAsBuiltPrintUrls] = useState<string[]>([]);
    const [bcfIssueId, setBcfIssueId] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const updateAsBuiltMutation = trpc.dashboard.updateApontamentoAsBuilt.useMutation({
        onSuccess: () => {
            toast.success("Ajustes As-Built salvos com sucesso!");
            setEditingApontamentoId(null);
            setAsBuiltNota("");
            setAsBuiltPrintUrls([]);
            setBcfIssueId("");
            utils.dashboard.getApontamentosBySala.invalidate({ projectId, sala: salaNome });
            utils.dashboard.getApontamentos.invalidate({ projectId });
        },
        onError: () => {
            toast.error("Erro ao salvar detalhes As-Built.");
        },
    });

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

    const handleToggle = (disc: string, currentStatus: string) => {
        const newStatus = currentStatus === "OK" ? "ATIVA" : "OK";
        const currentVer = verifications.find((v: any) => isSameDiscipline(v.disciplina, disc));
        upsertMutation.mutate({
            salaId: sala?.id || sala?.salaId,
            disciplina: disc,
            status: newStatus,
            observacao: currentVer?.observacao || "",
            printUrl: currentVer?.printUrl || "",
        });
    };

    const handleSaveAsBuilt = (id: number, currentStatus?: string) => {
        updateAsBuiltMutation.mutate({
            id,
            asBuiltNota: asBuiltNota,
            asBuiltPrintUrl: JSON.stringify(asBuiltPrintUrls),
            bcfIssueId: bcfIssueId,
            status:
                asBuiltNota || asBuiltPrintUrls.length > 0 || bcfIssueId
                    ? "EM_REVISAO"
                    : currentStatus,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden font-sans">
                {/* Header Stecla */}
                <DialogHeader className="p-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-6 bg-[#9C1915] rounded-xs" />
                            <div>
                                <DialogTitle className="text-sm font-bold uppercase tracking-wide text-slate-800">
                                    Verificação As-Built • {salaNome}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-[#575756]">
                                    {sala?.edificacao} • Pavimento: {sala?.pavimento || "—"} • Código:{" "}
                                    {sala?.numeroSala || "—"}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#F8FAFC]">
                    {disciplines.length === 0 && (
                        <div className="py-12 text-center text-xs text-slate-400 italic">
                            Nenhuma disciplina associada a esta edificação.
                        </div>
                    )}

                    {disciplines.map((disc) => {
                        const ver = verifications.find((v: any) => isSameDiscipline(v.disciplina, disc));
                        const isOk = ver?.status === "OK";

                        const discApontamentos = roomApontamentos.filter(
                            (a: any) => isSameDiscipline(a.disciplina, disc)
                        );

                        return (
                            <div
                                key={disc}
                                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Checkbox
                                            id={`chk-${disc}`}
                                            checked={isOk}
                                            onCheckedChange={() =>
                                                handleToggle(disc, ver?.status || "PENDENTE")
                                            }
                                            className="h-4 w-4 rounded data-[state=checked]:bg-[#9C1915] data-[state=checked]:border-[#9C1915]"
                                        />
                                        <label
                                            htmlFor={`chk-${disc}`}
                                            className="text-xs font-bold text-slate-800 uppercase cursor-pointer"
                                        >
                                            {disc}
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                isOk
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : discApontamentos.length > 0
                                                    ? "bg-red-50 text-[#9C1915] border-red-200"
                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                            }`}
                                        >
                                            {isOk
                                                ? "Conforme (OK)"
                                                : discApontamentos.length > 0
                                                ? `${discApontamentos.length} Divergência(s)`
                                                : "Pendente"}
                                        </span>
                                    </div>
                                </div>

                                {/* Lista de Apontamentos da Sala com fotos reais da obra e do modelo */}
                                {discApontamentos.length > 0 && (
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        {discApontamentos.map((apont: any) => {
                                            const isEditing = editingApontamentoId === apont.id;

                                            return (
                                                <div
                                                    key={apont.id}
                                                    className="bg-slate-50 border border-slate-200/80 rounded-md p-3 text-xs space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-[#9C1915]">
                                                                #{apont.numeroApontamento || apont.id}
                                                            </span>
                                                            <span className="text-[11px] font-semibold text-slate-800">
                                                                {apont.divergencia || "Sem descrição de divergência"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                                apont.status === "RESOLVIDA" || apont.status === "SANADA"
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : apont.status === "EM_REVISAO"
                                                                    ? "bg-amber-50 text-amber-700"
                                                                    : "bg-red-50 text-[#9C1915]"
                                                            }`}>
                                                                {apont.status}
                                                            </span>

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 px-2 text-[10px] font-bold text-slate-600 hover:text-[#9C1915]"
                                                                onClick={() => {
                                                                    if (isEditing) {
                                                                        setEditingApontamentoId(null);
                                                                    } else {
                                                                        setEditingApontamentoId(apont.id);
                                                                        setAsBuiltNota(apont.asBuiltNota || "");
                                                                        setBcfIssueId(apont.bcfIssueId || "");
                                                                        try {
                                                                            const parsed = JSON.parse(
                                                                                apont.asBuiltPrintUrl || "[]"
                                                                            );
                                                                            setAsBuiltPrintUrls(
                                                                                Array.isArray(parsed)
                                                                                    ? parsed
                                                                                    : [apont.asBuiltPrintUrl].filter(Boolean)
                                                                            );
                                                                        } catch {
                                                                            setAsBuiltPrintUrls(
                                                                                [apont.asBuiltPrintUrl].filter(Boolean)
                                                                            );
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <Pencil className="w-3 h-3 mr-1" />
                                                                {isEditing ? "Fechar" : "Ajustes As-Built"}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Fotos da Obra (Relato de Campo) e Snapshot do Modelo Navisworks */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                                        {apont.fotoUrl ? (
                                                            <div className="bg-white p-2 rounded border border-slate-200 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold uppercase text-[#575756]">
                                                                        Foto da Obra (Executado)
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewImage(apont.fotoUrl)}
                                                                        className="text-slate-400 hover:text-[#9C1915]"
                                                                        title="Ampliar foto"
                                                                    >
                                                                        <Maximize2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                <div
                                                                    className="h-28 bg-slate-100 rounded overflow-hidden cursor-pointer relative group"
                                                                    onClick={() => setPreviewImage(apont.fotoUrl)}
                                                                >
                                                                    <img
                                                                        src={apont.fotoUrl}
                                                                        alt="Foto da Obra"
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white p-3 rounded border border-dashed border-slate-200 text-center flex flex-col items-center justify-center h-28">
                                                                <span className="text-[10px] text-slate-400">
                                                                    Sem foto da obra cadastrada
                                                                </span>
                                                            </div>
                                                        )}

                                                        {apont.fotoReferenciaUrl ? (
                                                            <div className="bg-white p-2 rounded border border-slate-200 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold uppercase text-[#575756]">
                                                                        Snapshot Modelo (Navisworks)
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewImage(apont.fotoReferenciaUrl)}
                                                                        className="text-slate-400 hover:text-[#9C1915]"
                                                                        title="Ampliar snapshot"
                                                                    >
                                                                        <Maximize2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                <div
                                                                    className="h-28 bg-slate-100 rounded overflow-hidden cursor-pointer relative group"
                                                                    onClick={() => setPreviewImage(apont.fotoReferenciaUrl)}
                                                                >
                                                                    <img
                                                                        src={apont.fotoReferenciaUrl}
                                                                        alt="Snapshot Navisworks"
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white p-3 rounded border border-dashed border-slate-200 text-center flex flex-col items-center justify-center h-28">
                                                                <span className="text-[10px] text-slate-400">
                                                                    Sem snapshot do modelo anexado
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Painel de Edição As-Built */}
                                                    {isEditing && (
                                                        <div className="p-3 bg-white border border-slate-200 rounded-md space-y-2 mt-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-[#575756]">
                                                                    Nota Técnica de Validação As-Built
                                                                </label>
                                                                <Textarea
                                                                    value={asBuiltNota}
                                                                    onChange={(e) =>
                                                                        setAsBuiltNota(e.target.value)
                                                                    }
                                                                    placeholder="Descreva o que foi corrigido no modelo..."
                                                                    className="text-xs min-h-[60px] rounded-md border-slate-200"
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between pt-1">
                                                                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors">
                                                                    <Upload className="w-3.5 h-3.5" />
                                                                    {isUploading
                                                                        ? "Carregando..."
                                                                        : "Subir Print do Modelo"}
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
                                                                    className="h-7 px-3 text-xs font-bold rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white"
                                                                    onClick={() =>
                                                                        handleSaveAsBuilt(
                                                                            apont.id,
                                                                            apont.status
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        updateAsBuiltMutation.isPending
                                                                    }
                                                                >
                                                                    Salvar Ajustes
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>

            {/* Modal de Zoom da Imagem */}
            {previewImage && (
                <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <DialogContent className="max-w-4xl p-2 bg-black/95 border-none rounded-xl">
                        <div className="relative flex items-center justify-center p-2">
                            <img
                                src={previewImage}
                                alt="Visualização Ampliada"
                                className="max-h-[85vh] max-w-full object-contain rounded"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}
