import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft,
    Edit2,
    Trash2,
    FileText,
    CheckCircle2,
    Calendar,
    Building2,
    Layers,
    Briefcase,
    History,
    Plus,
    MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
import { STATUS_LABELS, DELIVERY_STATUS_OPTIONS, DOC_TYPES } from "../constants";

interface EntregaDetailViewProps {
    projectId: string;
    entrega: any;
    onBack: () => void;
    onUpdate: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function EntregaDetailView({
    projectId,
    entrega,
    onBack,
    onUpdate,
    onEdit,
    onDelete,
}: EntregaDetailViewProps) {
    const utils = trpc.useUtils();
    const [status, setStatus] = useState(
        DELIVERY_STATUS_OPTIONS.some((o) => o.value === entrega.status)
            ? entrega.status
            : "COM_PENDENCIAS"
    );
    const [comentario, setComentario] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });
    const { data: historico = [] } = trpc.dashboard.getHistoricoEntrega.useQuery({
        id: entrega.id,
    });

    const linkedScope = useMemo(
        () => escopos.find((s: any) => s.id === entrega.escopoId),
        [escopos, entrega.escopoId]
    );

    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
            utils.dashboard.getEscopos.invalidate({ projectId });
            utils.dashboard.getHistoricoEntrega.invalidate({ id: entrega.id });
            onUpdate();
            setComentario("");
            setIsUpdating(false);
        },
        onError: (error) => {
            alert("Erro ao atualizar entrega: " + error.message);
            setIsUpdating(false);
        },
    });

    const handleUpdateStatus = () => {
        setIsUpdating(true);
        mutation.mutate({
            ...entrega,
            dataPrevista: dayjs(entrega.dataPrevista).format("YYYY-MM-DD"),
            dataRecebimento: entrega.dataRecebimento
                ? dayjs(entrega.dataRecebimento).format("YYYY-MM-DD")
                : undefined,
            status,
            comentario: comentario || undefined,
        });
    };

    const handleSendComment = () => {
        if (!comentario.trim()) return;
        setIsUpdating(true);
        mutation.mutate({
            ...entrega,
            dataPrevista: dayjs(entrega.dataPrevista).format("YYYY-MM-DD"),
            dataRecebimento: entrega.dataRecebimento
                ? dayjs(entrega.dataRecebimento).format("YYYY-MM-DD")
                : undefined,
            status: status,
            comentario: comentario,
        });
    };

    const statusKey = entrega.status || "COM_PENDENCIAS";
    const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS["COM_PENDENCIAS"];
    const StatusIcon = statusInfo.icon;

    return (
        <div className="space-y-4 font-sans animate-in fade-in duration-200">
            {/* Top Bar Navigation */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBack}
                        className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold gap-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar</span>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-sm font-bold text-slate-900 font-mono">
                                {entrega.nomeDocumento}
                            </h1>
                            <Badge
                                className={`text-[10px] font-bold px-2 py-0.5 border flex items-center gap-1 w-fit ${statusInfo.color}`}
                            >
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50"
                            >
                                {entrega.formato || entrega.tipoDocumento}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-slate-700 hover:text-[#9C1915] rounded-lg gap-1.5 border-slate-200 text-xs font-semibold"
                        onClick={onEdit}
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-slate-700 hover:text-rose-600 rounded-lg gap-1.5 border-slate-200 text-xs font-semibold"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Coluna Esquerda (2 spans): Informações da Entrega */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#9C1915]" />
                                Informações da Entrega
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Nº Controle
                                    </span>
                                    <p className="font-bold text-[#9C1915] text-xs">
                                        #{entrega.numeroEntrega || entrega.id}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Pacote / SM
                                    </span>
                                    <p className="font-mono font-bold text-slate-800 text-xs">
                                        {entrega.identificadorEntrega || "-"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Formato
                                    </span>
                                    <p className="font-bold uppercase text-slate-700 text-xs">
                                        {entrega.formato || entrega.tipoDocumento || "-"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Data de Recebimento
                                    </span>
                                    <p className="font-bold text-slate-800 text-xs">
                                        {entrega.dataRecebimento
                                            ? dayjs(entrega.dataRecebimento).format("DD/MM/YYYY")
                                            : "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Edificação
                                    </span>
                                    <p className="font-semibold text-slate-800 text-xs">
                                        {entrega.edificacao}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Disciplina
                                    </span>
                                    <p className="font-semibold text-slate-800 text-xs">
                                        {entrega.disciplina}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Fornecedor / Responsável
                                    </span>
                                    <p className="font-semibold text-slate-800 text-xs">
                                        {entrega.empresaResponsavel}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Modelo Lista Mestra
                                    </span>
                                    <p className="font-mono text-[11px] text-slate-700 truncate" title={linkedScope?.nomeModeloFinal || "-"}>
                                        {linkedScope?.nomeModeloFinal || linkedScope?.nomeModelo || "Não vinculado"}
                                    </p>
                                </div>
                            </div>

                            {entrega.modeloBaseReferencia && (
                                <div className="space-y-1 pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Modelo Base de Projeto (Referência)
                                    </span>
                                    <p className="font-mono text-slate-700 text-xs">
                                        {entrega.modeloBaseReferencia}
                                    </p>
                                </div>
                            )}

                            {entrega.acoesNecessarias && (
                                <div className="space-y-1 pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-amber-700 uppercase">
                                        Ações Necessárias / Pendências
                                    </span>
                                    <p className="font-medium text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs">
                                        {entrega.acoesNecessarias}
                                    </p>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-100 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Descrição da Entrega
                                </span>
                                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                                    {entrega.descricao || "Nenhuma observação informada."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Direita (1 span): Gerenciamento de Status e Histórico */}
                <div className="space-y-4">
                    {/* Gerenciamento de Status */}
                    <Card className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#9C1915]" />
                                Gerenciamento de Auditoria
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3.5 text-xs">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Novo Status da Remessa
                                </label>
                                <select
                                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    {DELIVERY_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Comentário / Parecer Técnico
                                </label>
                                <Textarea
                                    placeholder="Registrar comentário ou motivo da classificação..."
                                    className="resize-none rounded-lg border-slate-200 min-h-[70px] text-xs"
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button
                                    className="flex-1 bg-[#9C1915] hover:bg-[#7D1411] text-white rounded-lg h-8 text-xs font-bold shadow-xs"
                                    onClick={handleUpdateStatus}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? "Salvando..." : "Atualizar Status"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-8 text-xs font-semibold"
                                    onClick={handleSendComment}
                                    disabled={isUpdating || !comentario.trim()}
                                >
                                    Comentar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Histórico / Logs */}
                    <Card className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <History className="w-4 h-4 text-[#9C1915]" />
                                Histórico de Ações ({historico.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar text-xs">
                                {historico.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-4 italic">
                                        Nenhum evento registrado até o momento.
                                    </p>
                                ) : (
                                    historico.map((h: any) => (
                                        <div
                                            key={h.id}
                                            className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1"
                                        >
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="font-bold uppercase text-slate-700">
                                                    {h.acao}
                                                </span>
                                                <span className="text-slate-400">
                                                    {dayjs(h.createdAt).format("DD/MM/YYYY HH:mm")}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-[11px]">
                                                {h.descricao}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
