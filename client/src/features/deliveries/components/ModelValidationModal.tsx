import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    X,
    CheckCircle2,
    AlertTriangle,
    CopyCheck,
    Clock,
    FileCode2,
    FileCheck2,
    Calendar,
    History,
    AlertCircle,
    Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
import {
    isSameDiscipline,
    normalizeEdificacao,
} from "@/features/issues/constants";

interface ModelValidationModalProps {
    projectId: string;
    escopo: any;
    apontamentos?: any[];
    onClose: () => void;
}

const STATUS_3D_OPTIONS = [
    {
        value: "VALIDADO",
        label: "Validado",
        sub: "Conforme obra",
        icon: CheckCircle2,
        activeClass: "border-emerald-600 bg-emerald-50/70 text-emerald-900",
        iconColor: "text-emerald-600",
    },
    {
        value: "COM_PENDENCIAS",
        label: "Com Pendências",
        sub: "Retornar p/ ajuste",
        icon: AlertTriangle,
        activeClass: "border-amber-500 bg-amber-50/70 text-amber-900",
        iconColor: "text-amber-600",
    },
    {
        value: "IGUAL_PROJETO",
        label: "Igual ao Projeto",
        sub: "Sem As-Built real",
        icon: CopyCheck,
        activeClass: "border-[#9C1915] bg-red-50/70 text-[#9C1915]",
        iconColor: "text-[#9C1915]",
    },
    {
        value: "NAO_ENTREGUE",
        label: "Não Entregue",
        sub: "Aguardando envio",
        icon: Clock,
        activeClass: "border-slate-500 bg-slate-100 text-slate-900",
        iconColor: "text-slate-600",
    },
];

const QUICK_NOTES = [
    "Divergências de campo (Projeto x Obra) ainda não corrigidas no modelo",
    "Modelo entregue é cópia idêntica ao projeto executivo",
    "Falta envio de documentação 2D (.DWG e .PDF) das pranchas",
    "Falta arquivo nativo editável (.RVT) — enviado apenas .IFC",
    "Modelo 3D e pranchas DWG/PDF validados conforme obra",
];

export function ModelValidationModal({
    projectId,
    escopo,
    apontamentos = [],
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
        escopo.parecerTecnico && escopo.parecerTecnico !== "OK"
            ? escopo.parecerTecnico
            : ""
    );

    // Opcional: registrar nova entrega quinzenal (SM) no histórico
    const [registrarSm, setRegistrarSm] = useState<boolean>(false);
    const [identificadorSm, setIdentificadorSm] = useState<string>(
        `SM 41 - ${dayjs().format("DD.MM.YYYY")}`
    );
    const [dataSm, setDataSm] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [incluirPranchasNaSm, setIncluirPranchasNaSm] = useState<boolean>(false);

    const { data: parciais = [] } = trpc.dashboard.getEntregasByEscopo.useQuery({
        escopoId: escopo.id,
    });

    // Última entrega recebida deste modelo
    const ultimaRemessa = useMemo(() => {
        if (!parciais || parciais.length === 0) return null;
        const sorted = [...parciais].sort((a: any, b: any) => {
            const da = a.dataRecebimento ? new Date(a.dataRecebimento).getTime() : 0;
            const db = b.dataRecebimento ? new Date(b.dataRecebimento).getTime() : 0;
            return db - da;
        });
        return sorted[0];
    }, [parciais]);

    // Indicador simples de apontamentos vinculados a esta Disciplina + Edificação
    const modelIssuesInfo = useMemo(() => {
        const targetEdif = normalizeEdificacao(escopo.edificacao || "")
            .trim()
            .toLowerCase();

        const matched = apontamentos.filter((a: any) => {
            const aEdif = normalizeEdificacao(a.edificacao || "")
                .trim()
                .toLowerCase();
            const sameEdif =
                aEdif === targetEdif ||
                aEdif.includes(targetEdif) ||
                targetEdif.includes(aEdif);
            const sameDisc = isSameDiscipline(a.disciplina || "", escopo.disciplina || "");
            return sameEdif && sameDisc;
        });

        const total = matched.length;
        const pendentes = matched.filter(
            (a: any) => a.status === "ATIVA" || a.status === "EM_REVISAO"
        ).length;
        const sanadas = matched.filter(
            (a: any) => a.status === "RESOLVIDA" || a.status === "SANADA"
        ).length;

        return {
            hasIssues: total > 0,
            hasPending: pendentes > 0,
            total,
            pendentes,
            sanadas,
        };
    }, [apontamentos, escopo.disciplina, escopo.edificacao]);

    const invalidateAll = () => {
        utils.dashboard.getEscopos.invalidate({ projectId });
        utils.dashboard.getEntregas.invalidate({ projectId });
        utils.dashboard.getEntregasStats.invalidate({ projectId });
        utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
        utils.dashboard.getEntregasByEscopo.invalidate({ escopoId: escopo.id });
        utils.analytics.getAsBuiltModelsSummary.invalidate({ projectId });
    };

    const updateEntregaMutation = trpc.dashboard.upsertEntrega.useMutation();

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
        quickUpdateMutation.isPending ||
        registrarQuinzenaMutation.isPending ||
        updateEntregaMutation.isPending;

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
            // Sincroniza também o status da última entrega recebida (caso exista)
            if (ultimaRemessa?.id) {
                try {
                    await updateEntregaMutation.mutateAsync({
                        ...ultimaRemessa,
                        projectId: ultimaRemessa.projectId ?? undefined,
                        escopoId: ultimaRemessa.escopoId ?? undefined,
                        numeroEntrega: ultimaRemessa.numeroEntrega ?? undefined,
                        status: statusModelo,
                        descricao: parecerTecnico.trim() || ultimaRemessa.descricao,
                    });
                } catch {
                    // Prossegue com atualização do escopo
                }
            }

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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header Padrão Stecla */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-1.5 h-10 bg-[#9C1915] rounded-xs shrink-0" />
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-[#9C1915] text-white">
                                    {escopo.empresa}
                                </span>
                                <span className="text-base font-bold uppercase tracking-wide text-slate-900">
                                    {escopo.disciplina} • {escopo.edificacao}
                                </span>
                                <span className="font-mono text-xs text-slate-500">
                                    ({escopo.nomeModeloFinal || escopo.nomeModelo})
                                </span>

                                {/* Indicador direto se há apontamentos na verificação de As-Built */}
                                {modelIssuesInfo.hasPending ? (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 whitespace-nowrap">
                                        <AlertCircle className="w-3.5 h-3.5 text-[#9C1915]" />
                                        Possui Apontamentos ({modelIssuesInfo.pendentes} pendentes)
                                    </span>
                                ) : modelIssuesInfo.hasIssues ? (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 whitespace-nowrap">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Apontamentos Sanados ({modelIssuesInfo.sanadas})
                                    </span>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                {ultimaRemessa ? (
                                    <span>
                                        Status referente à última entrega:{" "}
                                        <strong className="text-slate-800">
                                            {ultimaRemessa.identificadorEntrega || "SM"} (
                                            {ultimaRemessa.dataRecebimento
                                                ? dayjs(ultimaRemessa.dataRecebimento).format(
                                                      "DD/MM/YYYY"
                                                  )
                                                : "—"}
                                            )
                                        </strong>
                                    </span>
                                ) : (
                                    <span>
                                        Nenhuma remessa quinzenal (SM) registrada ainda para este modelo.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 rounded-md p-1.5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body em 2 Colunas (Mais Largo e com Textos Maiores) */}
                <form
                    onSubmit={handleSave}
                    className="p-6 overflow-y-auto flex-1 custom-scrollbar text-sm space-y-5"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* COLUNA ESQUERDA (6 COLUNAS): STATUS 3D + PRANCHAS 2D */}
                        <div className="lg:col-span-6 space-y-5">
                            {/* 1. STATUS DO MODELO 3D (ÚLTIMA ENTREGA) */}
                            <div className="border border-slate-200 rounded-xl p-5 space-y-3.5 bg-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                        <FileCode2 className="w-4 h-4 text-[#9C1915]" />
                                        1. Status do Último Modelo 3D
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setTemRvtOriginal(temRvtOriginal === 1 ? 0 : 1)
                                        }
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${
                                            temRvtOriginal === 1
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}
                                    >
                                        {temRvtOriginal === 1
                                            ? "RVT Nativo: OK"
                                            : "RVT Nativo: Pendente"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {STATUS_3D_OPTIONS.map((opt) => {
                                        const Icon = opt.icon;
                                        const isSelected = statusModelo === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setStatusModelo(opt.value)}
                                                className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2.5 ${
                                                    isSelected
                                                        ? `${opt.activeClass} font-bold shadow-2xs`
                                                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Icon
                                                        className={`w-4 h-4 shrink-0 ${
                                                            isSelected
                                                                ? opt.iconColor
                                                                : "text-slate-400"
                                                        }`}
                                                    />
                                                    <div>
                                                        <div className="font-bold text-sm leading-tight">
                                                            {opt.label}
                                                        </div>
                                                        <div className="text-xs opacity-80 mt-0.5">
                                                            {opt.sub}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. DOCUMENTAÇÃO 2D DA DISCIPLINA (.DWG / .PDF) */}
                            <div className="border border-slate-200 rounded-xl p-5 space-y-3.5 bg-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                        <FileCheck2 className="w-4 h-4 text-[#9C1915]" />
                                        2. Documentação 2D (Pranchas .DWG / .PDF)
                                    </span>

                                    {totalPranchas > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setPranchasValidadas(totalPranchas);
                                                setStatusPranchas("VALIDADO");
                                            }}
                                            className="h-7 px-2.5 text-xs font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md"
                                        >
                                            Aprovar Todas ({totalPranchas})
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-3.5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-slate-500">
                                            Total Previstas
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={totalPranchas}
                                            onChange={(e) =>
                                                setTotalPranchas(
                                                    Math.max(0, parseInt(e.target.value) || 0)
                                                )
                                            }
                                            className="h-9 text-sm font-bold border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-slate-500">
                                            Validadas
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={totalPranchas || 999}
                                            value={pranchasValidadas}
                                            onChange={(e) => {
                                                const val = Math.max(
                                                    0,
                                                    parseInt(e.target.value) || 0
                                                );
                                                setPranchasValidadas(val);
                                                if (totalPranchas > 0 && val >= totalPranchas) {
                                                    setStatusPranchas("VALIDADO");
                                                } else if (val > 0) {
                                                    setStatusPranchas("COM_PENDENCIAS");
                                                }
                                            }}
                                            className="h-9 text-sm font-bold border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-slate-500">
                                            Status 2D
                                        </label>
                                        <select
                                            value={statusPranchas}
                                            onChange={(e) => setStatusPranchas(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#9C1915]"
                                        >
                                            <option value="NAO_ENTREGUE">Pendente</option>
                                            <option value="COM_PENDENCIAS">Com Pendências</option>
                                            <option value="VALIDADO">Validado</option>
                                            <option value="NAO_APLICAVEL">Não Aplicável</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA (6 COLUNAS): PARECER TÉCNICO + REGISTRO DE QUINZENA */}
                        <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
                            {/* 3. PARECER TÉCNICO / OBSERVAÇÕES PARA RETORNO */}
                            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-white flex-1 flex flex-col justify-between">
                                <div className="space-y-2.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                                        3. Parecer Técnico / Retorno p/ {escopo.empresa}
                                    </label>

                                    <div className="flex flex-wrap gap-1.5">
                                        {QUICK_NOTES.map((note) => (
                                            <button
                                                key={note}
                                                type="button"
                                                onClick={() => handleAppendQuickNote(note)}
                                                className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 hover:bg-red-50 hover:text-[#9C1915] text-slate-700 transition-colors text-left"
                                            >
                                                + {note}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Textarea
                                    value={parecerTecnico}
                                    onChange={(e) => setParecerTecnico(e.target.value)}
                                    placeholder="Registre o parecer da validação deste modelo (ex: divergências de campo pendentes de ajuste, pranchas faltantes, modelo igual ao projeto...)"
                                    className="resize-none rounded-lg border-slate-200 min-h-[110px] text-sm bg-slate-50/40 focus:bg-white mt-2 p-3"
                                />
                            </div>

                            {/* 4. REGISTRO DE QUINZENA (SM) & HISTÓRICO */}
                            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={registrarSm}
                                            onChange={(e) => setRegistrarSm(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-[#9C1915] focus:ring-[#9C1915]"
                                        />
                                        <span className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-[#9C1915]" />
                                            Registrar Nova Entrega Quinzenal (SM)
                                        </span>
                                    </label>
                                    <span className="text-xs font-bold text-slate-500">
                                        {parciais.length} remessas
                                    </span>
                                </div>

                                {registrarSm && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-slate-200">
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-600">
                                                Pacote / Quinzena (SM) *
                                            </label>
                                            <Input
                                                value={identificadorSm}
                                                onChange={(e) => setIdentificadorSm(e.target.value)}
                                                placeholder="Ex: SM 41 - 15.10.2026"
                                                className="h-9 text-sm font-bold bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-slate-600">
                                                Data *
                                            </label>
                                            <Input
                                                type="date"
                                                value={dataSm}
                                                onChange={(e) => setDataSm(e.target.value)}
                                                className="h-9 text-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {parciais.length > 0 && (
                                    <div className="pt-2.5 border-t border-slate-200/70">
                                        <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 mb-1.5">
                                            <History className="w-3.5 h-3.5" /> Últimas Remessas:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                            {parciais.slice(0, 6).map((p: any, idx: number) => (
                                                <span
                                                    key={p.id}
                                                    className={`text-xs px-2.5 py-0.5 rounded-md border font-semibold ${
                                                        idx === 0
                                                            ? "bg-red-50 border-red-200 text-[#9C1915]"
                                                            : "bg-white border-slate-200 text-slate-600"
                                                    }`}
                                                >
                                                    {p.identificadorEntrega || "SM"} •{" "}
                                                    {p.dataRecebimento
                                                        ? dayjs(p.dataRecebimento).format("DD/MM/YY")
                                                        : "-"}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Padrão Stecla */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-9 px-5 text-sm font-semibold rounded-md border-slate-200"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="h-9 px-6 rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white text-sm font-bold shadow-xs"
                        >
                            {isPending
                                ? "Salvando..."
                                : registrarSm
                                ? "Salvar Validação + Quinzena (SM)"
                                : "Salvar Validação"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
