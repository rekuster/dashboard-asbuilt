import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    X,
    CheckCircle2,
    AlertTriangle,
    CopyCheck,
    Clock,
    FileCode2,
    FileCheck2,
    Calendar,
    Plus,
    Sparkles,
    History,
    Building2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";

interface ModelValidationModalProps {
    projectId: string;
    escopo: any;
    onClose: () => void;
}

const STATUS_3D_OPTIONS = [
    {
        value: "VALIDADO",
        label: "Validado",
        sub: "Modelo conforme obra",
        icon: CheckCircle2,
        activeClass: "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20",
        iconColor: "text-emerald-600",
    },
    {
        value: "COM_PENDENCIAS",
        label: "Com Pendências",
        sub: "Retornar p/ instaladora",
        icon: AlertTriangle,
        activeClass: "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20",
        iconColor: "text-amber-600",
    },
    {
        value: "IGUAL_PROJETO",
        label: "Igual ao Projeto",
        sub: "Sem As-Built real",
        icon: CopyCheck,
        activeClass: "border-[#9C1915] bg-red-50 text-[#9C1915] ring-2 ring-[#9C1915]/20",
        iconColor: "text-[#9C1915]",
    },
    {
        value: "NAO_ENTREGUE",
        label: "Não Entregue",
        sub: "Aguardando envio",
        icon: Clock,
        activeClass: "border-slate-500 bg-slate-100 text-slate-900 ring-2 ring-slate-400/20",
        iconColor: "text-slate-600",
    },
];

const QUICK_NOTES = [
    "Divergências de campo (Projeto x Obra) ainda não corrigidas no modelo",
    "Modelo entregue é cópia idêntica ao projeto executivo",
    "Falta envio de documentação 2D (.DWG e .PDF) das pranchas",
    "Falta arquivo nativo editável (.RVT) — enviado apenas .IFC",
    "Última entrega quinzenal em análise pela equipe Stecla",
    "Modelo 3D e pranchas DWG/PDF validados conforme obra",
];

export function ModelValidationModal({
    projectId,
    escopo,
    onClose,
}: ModelValidationModalProps) {
    const utils = trpc.useUtils();

    const [statusModelo, setStatusModelo] = useState<string>(
        escopo.statusAuditoria || escopo.statusModelo || "NAO_ENTREGUE"
    );
    const [temRvtOriginal, setTemRvtOriginal] = useState<number>(
        escopo.temRvtOriginal ?? 1
    );
    const [totalPranchas, setTotalPranchas] = useState<number>(
        escopo.totalPranchas ?? 0
    );
    const [pranchasValidadas, setPranchasValidadas] = useState<number>(
        escopo.pranchasValidadas ?? 0
    );
    const [statusPranchas, setStatusPranchas] = useState<string>(
        escopo.statusPranchas || "NAO_ENTREGUE"
    );
    const [parecerTecnico, setParecerTecnico] = useState<string>(
        escopo.parecerTecnico || ""
    );

    // Opcional: registrar também como uma entrega quinzenal (SM) no histórico
    const [registrarSm, setRegistrarSm] = useState<boolean>(false);
    const [identificadorSm, setIdentificadorSm] = useState<string>(
        escopo.ultimaEntregaIdentificador || `SM 41 - ${dayjs().format("DD.MM.YYYY")}`
    );
    const [dataSm, setDataSm] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [incluirPranchasNaSm, setIncluirPranchasNaSm] = useState<boolean>(false);

    const { data: parciais = [] } = trpc.dashboard.getEntregasByEscopo.useQuery({
        escopoId: escopo.id,
    });

    const invalidateAll = () => {
        utils.dashboard.getEscopos.invalidate({ projectId });
        utils.dashboard.getEntregas.invalidate({ projectId });
        utils.dashboard.getEntregasStats.invalidate({ projectId });
        utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
        utils.dashboard.getEntregasByEscopo.invalidate({ escopoId: escopo.id });
        utils.analytics.getAsBuiltModelsSummary.invalidate({ projectId });
    };

    const quickUpdateMutation = trpc.dashboard.quickUpdateEscopo.useMutation({
        onSuccess: () => {
            invalidateAll();
            onClose();
        },
        onError: (err) => alert("Erro ao salvar validação: " + err.message),
    });

    const registrarQuinzenaMutation = trpc.dashboard.registrarQuinzenaModulos.useMutation({
        onSuccess: () => {
            invalidateAll();
            onClose();
        },
        onError: (err) => alert("Erro ao registrar quinzena: " + err.message),
    });

    const isPending =
        quickUpdateMutation.isPending || registrarQuinzenaMutation.isPending;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (registrarSm) {
            if (!identificadorSm.trim()) {
                alert("Informe o código da Quinzena / SM (ex: SM 41 - 15.10.2026).");
                return;
            }
            await registrarQuinzenaMutation.mutateAsync({
                projectId,
                identificadorEntrega: identificadorSm.trim(),
                dataRecebimento: dataSm,
                itens: [
                    {
                        escopoId: escopo.id,
                        statusModelo,
                        entregouModelo3d: true,
                        entregouPranchas2d: incluirPranchasNaSm,
                        totalPranchas,
                        pranchasValidadas,
                        statusPranchas,
                        parecerTecnico: parecerTecnico.trim() || null,
                    },
                ],
            });
        } else {
            await quickUpdateMutation.mutateAsync({
                id: escopo.id,
                statusModelo,
                temRvtOriginal,
                totalPranchas,
                pranchasValidadas,
                statusPranchas,
                parecerTecnico: parecerTecnico.trim() || null,
            });
        }
    };

    const handleAppendQuickNote = (note: string) => {
        setParecerTecnico((prev) => {
            if (!prev.trim()) return note;
            if (prev.includes(note)) return prev;
            return `${prev.trim()}; ${note}`;
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50/70 shrink-0">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-[#9C1915] text-white text-[10px] font-black uppercase px-2 py-0.5">
                                {escopo.empresa}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-bold bg-white text-slate-700 border-slate-300 flex items-center gap-1"
                            >
                                <Building2 className="w-3 h-3 text-[#9C1915]" />
                                {escopo.edificacao}
                            </Badge>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-900">
                                • {escopo.disciplina}
                            </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-600">
                            Modelo As-Built:{" "}
                            <strong className="text-slate-900">
                                {escopo.nomeModeloFinal || escopo.nomeModelo}
                            </strong>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 rounded-lg p-1 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <form
                    onSubmit={handleSave}
                    className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-xs"
                >
                    {/* BLOCO 1: VALIDAÇÃO DO MODELO 3D */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <FileCode2 className="w-4 h-4 text-[#9C1915]" />
                                1. Status do Modelo 3D (.RVT / .IFC)
                            </label>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500">
                                    Arquivo Nativo (.RVT):
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setTemRvtOriginal(temRvtOriginal === 1 ? 0 : 1)
                                    }
                                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                                        temRvtOriginal === 1
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                            : "bg-amber-50 text-amber-700 border-amber-300"
                                    }`}
                                >
                                    {temRvtOriginal === 1 ? "✓ RVT Nativo OK" : "⚠ Pendente RVT"}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {STATUS_3D_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = statusModelo === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setStatusModelo(opt.value)}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                            isSelected
                                                ? opt.activeClass
                                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <Icon
                                                className={`w-4 h-4 ${
                                                    isSelected ? opt.iconColor : "text-slate-400"
                                                }`}
                                            />
                                            {isSelected && (
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-white/80 rounded">
                                                    Atual
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs leading-tight">
                                                {opt.label}
                                            </div>
                                            <div className="text-[10px] opacity-75 mt-0.5">
                                                {opt.sub}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* BLOCO 2: DOCUMENTAÇÃO 2D DA DISCIPLINA (PRANCHAS .DWG E .PDF) */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <FileCheck2 className="w-4 h-4 text-blue-700" />
                                    2. Documentação 2D da Disciplina (Pranchas .DWG e .PDF)
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    Controle de folhas executivas / As-Built atreladas a {escopo.disciplina} ({escopo.edificacao})
                                </span>
                            </div>

                            {totalPranchas > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setPranchasValidadas(totalPranchas);
                                        setStatusPranchas("VALIDADO");
                                    }}
                                    className="h-7 px-2.5 text-[10px] font-bold border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                                >
                                    ✓ Validar Todas ({totalPranchas} pranchas)
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Total Pranchas Previstas (DWG/PDF)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={totalPranchas}
                                    onChange={(e) =>
                                        setTotalPranchas(Math.max(0, parseInt(e.target.value) || 0))
                                    }
                                    className="h-8 text-xs font-bold bg-white border-slate-200"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Pranchas Validadas
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={totalPranchas || 999}
                                    value={pranchasValidadas}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setPranchasValidadas(val);
                                        if (totalPranchas > 0 && val >= totalPranchas) {
                                            setStatusPranchas("VALIDADO");
                                        } else if (val > 0) {
                                            setStatusPranchas("COM_PENDENCIAS");
                                        }
                                    }}
                                    className="h-8 text-xs font-bold bg-white border-slate-200"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-600">
                                    Status Documentação 2D
                                </label>
                                <select
                                    value={statusPranchas}
                                    onChange={(e) => setStatusPranchas(e.target.value)}
                                    className="flex h-8 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800"
                                >
                                    <option value="NAO_ENTREGUE">⬜ Pendente / Não Entregue</option>
                                    <option value="COM_PENDENCIAS">🟨 Entregue c/ Pendências</option>
                                    <option value="VALIDADO">🟩 DWG & PDF Validados</option>
                                    <option value="NAO_APLICAVEL">➖ Não Aplicável (Só 3D)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* BLOCO 3: PARECER TÉCNICO RÁPIDO / RESUMO DE PENDÊNCIAS */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                            3. Parecer Técnico / Resumo das Pendências (Retorno p/ {escopo.empresa})
                        </label>

                        {/* Sugestões em 1 clique */}
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_NOTES.map((note) => (
                                <button
                                    key={note}
                                    type="button"
                                    onClick={() => handleAppendQuickNote(note)}
                                    className="text-[10px] font-medium px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 hover:text-[#9C1915] text-slate-600 border border-slate-200 transition-colors"
                                >
                                    + {note}
                                </button>
                            ))}
                        </div>

                        <Textarea
                            value={parecerTecnico}
                            onChange={(e) => setParecerTecnico(e.target.value)}
                            placeholder="Descreva de forma objetiva o status do modelo nativo e pranchas DWG/PDF (ex: divergências de campo pendentes de ajuste pela Ocle, modelo igual ao projeto, pranchas faltantes...)"
                            className="resize-none rounded-xl border-slate-200 min-h-[80px] text-xs bg-white"
                        />
                    </div>

                    {/* BLOCO 4: REGISTRAR NO CICLO QUINZENAL (OPCIONAL) + HISTÓRICO */}
                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={registrarSm}
                                    onChange={(e) => setRegistrarSm(e.target.checked)}
                                    className="rounded border-slate-300 text-[#9C1915] focus:ring-[#9C1915]"
                                />
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#9C1915]" />
                                    Registrar também um recebimento quinzenal (SM) para este modelo
                                </span>
                            </label>
                            <span className="text-[10px] font-bold text-slate-500">
                                {parciais.length} {parciais.length === 1 ? "remessa anterior" : "remessas anteriores"}
                            </span>
                        </div>

                        {registrarSm && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 animate-in fade-in">
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-[#9C1915]">
                                        Identificação da Quinzena / SM *
                                    </label>
                                    <Input
                                        value={identificadorSm}
                                        onChange={(e) => setIdentificadorSm(e.target.value)}
                                        placeholder="Ex: SM 41 - 15.10.2026"
                                        className="h-8 text-xs font-bold bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-600">
                                        Data da Entrega *
                                    </label>
                                    <Input
                                        type="date"
                                        value={dataSm}
                                        onChange={(e) => setDataSm(e.target.value)}
                                        className="h-8 text-xs bg-white"
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={incluirPranchasNaSm}
                                            onChange={(e) => setIncluirPranchasNaSm(e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        Incluir entrega de pacote de Pranchas 2D (.DWG/.PDF) nesta quinzena
                                    </label>
                                </div>
                            </div>
                        )}

                        {parciais.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60">
                                <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1.5">
                                    <History className="w-3 h-3" /> Últimas Quinzenas Recebidas deste Modelo:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {parciais.slice(0, 6).map((p: any) => (
                                        <Badge
                                            key={p.id}
                                            variant="outline"
                                            className="text-[10px] bg-white border-slate-200 text-slate-700 font-medium"
                                        >
                                            {p.identificadorEntrega || "SM"} •{" "}
                                            {p.dataRecebimento
                                                ? dayjs(p.dataRecebimento).format("DD/MM/YY")
                                                : "-"}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
                            disabled={isPending}
                            className="h-8 px-5 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold shadow-xs"
                        >
                            {isPending
                                ? "Salvando..."
                                : registrarSm
                                ? "Salvar Validação + Quinzena (SM)"
                                : "Salvar Validação do Modelo"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
