import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, History, Calendar, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";
import { STATUS_LABELS } from "../constants";
import { VerificacaoPanel } from "./VerificacaoPanel";
import { ParcialFormModal } from "./ParcialFormModal";

interface TimelineParciaisProps {
    escopo: any;
    onBack: () => void;
    onViewEntrega: (e: any) => void;
}

export function TimelineParciais({ escopo, onBack, onViewEntrega }: TimelineParciaisProps) {
    const [verificandoId, setVerificandoId] = useState<number | null>(null);
    const [isParcialFormOpen, setIsParcialFormOpen] = useState(false);

    const { data: parciais = [], isLoading } = trpc.dashboard.getEntregasByEscopo.useQuery({
        escopoId: escopo.id,
    });
    const utils = trpc.useUtils();

    const validados = parciais.filter((p: any) => p.status === "VALIDADO").length;
    const rejeitados = parciais.filter((p: any) => p.status === "REJEITADO").length;
    const aguardando = parciais.filter(
        (p: any) =>
            p.status === "AGUARDANDO" || p.status === "RECEBIDO" || p.status === "EM_REVISAO"
    ).length;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="rounded-full gap-2 hover:bg-white/50 text-xs font-bold"
                >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-600">Voltar à Lista Mestra</span>
                </Button>
            </div>

            {/* Escopo Header */}
            <Card className="border-none shadow-xl bg-gradient-to-r from-[#940707]/5 to-white/70 backdrop-blur-md rounded-3xl">
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{escopo.nomeModelo}</h2>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="px-3 py-1 bg-[#940707]/10 text-[#940707] rounded-full text-xs font-bold">
                                    {escopo.empresa}
                                </span>
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                    {escopo.disciplina}
                                </span>
                                <span className="text-sm text-slate-400">•</span>
                                <span className="text-xs text-slate-500 font-medium">
                                    {escopo.edificacao}
                                </span>
                                {escopo.nomeModeloFinal && (
                                    <>
                                        <span className="text-sm text-slate-400">•</span>
                                        <span
                                            className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]"
                                            title={`Modelo Final: ${escopo.nomeModeloFinal}`}
                                        >
                                            Final: {escopo.nomeModeloFinal}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 text-center">
                            <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border">
                                <div className="text-xl font-bold text-slate-800">
                                    {parciais.length}
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">
                                    Parciais
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-emerald-50 rounded-2xl shadow-sm border border-emerald-100">
                                <div className="text-xl font-bold text-emerald-600">{validados}</div>
                                <div className="text-[9px] font-bold text-emerald-500 uppercase">
                                    Validados
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-amber-50 rounded-2xl shadow-sm border border-amber-100">
                                <div className="text-xl font-bold text-amber-600">{aguardando}</div>
                                <div className="text-[9px] font-bold text-amber-500 uppercase">
                                    Pendentes
                                </div>
                            </div>
                            {rejeitados > 0 && (
                                <div className="px-4 py-2 bg-rose-50 rounded-2xl shadow-sm border border-rose-100">
                                    <div className="text-xl font-bold text-rose-600">
                                        {rejeitados}
                                    </div>
                                    <div className="text-[9px] font-bold text-rose-500 uppercase">
                                        Rejeitados
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Parciais List */}
            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                        <History className="w-4 h-4 text-[#940707]" />
                        Entregas Parciais
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center py-10 text-slate-400 italic text-xs">
                            Carregando parciais...
                        </p>
                    ) : parciais.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-xs">Nenhuma entrega parcial registrada</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {parciais.map((parcial: any, idx: number) => {
                                const statusInfo =
                                    STATUS_LABELS[parcial.status] || STATUS_LABELS["AGUARDANDO"];
                                const StatusIcon = statusInfo.icon;
                                const isVerifying = verificandoId === parcial.id;

                                return (
                                    <div
                                        key={parcial.id}
                                        className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/50 transition-colors cursor-pointer bg-white"
                                        onClick={() => onViewEntrega(parcial)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    #{parciais.length - idx}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-slate-800">
                                                        {parcial.nomeDocumento}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                        {parcial.periodoInicio &&
                                                            parcial.periodoFim && (
                                                                <>
                                                                    <Calendar className="w-3 h-3" />
                                                                    <span>
                                                                        {dayjs(
                                                                            parcial.periodoInicio
                                                                        ).format("DD/MM")}{" "}
                                                                        a{" "}
                                                                        {dayjs(
                                                                            parcial.periodoFim
                                                                        ).format("DD/MM/YYYY")}
                                                                    </span>
                                                                    <span>•</span>
                                                                </>
                                                            )}
                                                        <span>
                                                            Recebido:{" "}
                                                            {parcial.dataRecebimento
                                                                ? dayjs(
                                                                      parcial.dataRecebimento
                                                                  ).format("DD/MM/YYYY")
                                                                : "Não recebido"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {parcial.resultado && (
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                            parcial.resultado === "CONFORME"
                                                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                                : "bg-rose-100 text-rose-700 border border-rose-200"
                                                        }`}
                                                    >
                                                        {parcial.resultado === "CONFORME"
                                                            ? "✓ Conforme"
                                                            : "✗ Não Conforme"}
                                                    </span>
                                                )}
                                                <div
                                                    className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase flex items-center gap-1 w-fit ${statusInfo.color}`}
                                                >
                                                    <StatusIcon className="w-2.5 h-2.5" />
                                                    {statusInfo.label}
                                                </div>

                                                {!parcial.resultado &&
                                                    (parcial.status === "RECEBIDO" ||
                                                        parcial.status === "EM_REVISAO") && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-full text-xs border-[#940707] text-[#940707] hover:bg-[#940707] hover:text-white h-7"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setVerificandoId(
                                                                    isVerifying ? null : parcial.id
                                                                );
                                                            }}
                                                        >
                                                            <Search className="w-3 h-3 mr-1" />
                                                            Verificar
                                                        </Button>
                                                    )}
                                            </div>
                                        </div>

                                        {isVerifying && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <VerificacaoPanel
                                                    entregaId={parcial.id}
                                                    onDone={() => {
                                                        setVerificandoId(null);
                                                        utils.dashboard.getEntregasByEscopo.invalidate(
                                                            { escopoId: escopo.id }
                                                        );
                                                        utils.dashboard.getEntregas.invalidate();
                                                        utils.dashboard.getEntregasStats.invalidate();
                                                    }}
                                                    onCancel={() => setVerificandoId(null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isParcialFormOpen && (
                <ParcialFormModal
                    escopo={escopo}
                    parcialCount={parciais.length}
                    onClose={() => setIsParcialFormOpen(false)}
                />
            )}
        </div>
    );
}
