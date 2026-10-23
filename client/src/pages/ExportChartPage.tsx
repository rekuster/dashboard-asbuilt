import React, { useMemo, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import AsBuiltModelsExecutiveSummary from "@/components/dashboard/AsBuiltModelsExecutiveSummary";
import KPICard from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Building2,
    CheckCircle2,
    Database,
    Layers,
    LayoutDashboard,
    Loader2,
    Box,
    Smartphone,
} from "lucide-react";

/**
 * Evolução A: Página limpa de exportação de gráficos e cards para o Suplemento PowerPoint
 * Rota: /export/:projectId/grafico/:tipo
 * Tipos suportados:
 *  - "semana": Cartão Apontamentos por Semana (774x332 pt)
 *  - "disciplina": Cartão Apontamentos por Disciplina (380x332 pt)
 *  - "asbuilt-edificacoes": Gráfico de barras Status por Edificação (Modelos 3D) por contratada (?empresa=Thá|Ocle|AeB|Todas)
 *  - "asbuilt-painel": Painel Executivo completo de Modelos 3D & Pranchas 2D por contratada (?empresa=Thá|Ocle|AeB|Todas)
 *  - "card": Card individual de indicador (com texto da porcentagem em verde!) (?edificacao=...&indicador=taxa_verificacao|salas_verificadas|...)
 *  - "cards-row": Linha completa de 4 cards de uma edificação pronta para o slide
 */
export default function ExportChartPage() {
    const { projectId, tipo } = useParams<{ projectId: string; tipo: string }>();

    const queryParams = useMemo(() => {
        const search = new URLSearchParams(window.location.search);
        return {
            edificacao: search.get("edificacao") || undefined,
            empresa: search.get("empresa") || "Thá",
            indicador: search.get("indicador") || search.get("card") || "taxa_verificacao",
            width: search.get("w") ? Number(search.get("w")) : undefined,
            height: search.get("h") ? Number(search.get("h")) : undefined,
        };
    }, []);

    const normalizedTipo = (tipo || "semana").toLowerCase();

    useEffect(() => {
        if (normalizedTipo === "card" || normalizedTipo === "cards-row") {
            document.body.classList.remove("bg-slate-50");
            document.body.style.backgroundColor = "transparent";
            document.documentElement.style.backgroundColor = "transparent";
            return () => {
                document.body.classList.add("bg-slate-50");
                document.body.style.backgroundColor = "";
                document.documentElement.style.backgroundColor = "";
            };
        }
    }, [normalizedTipo]);

    const {
        data: semanaData = [],
        isLoading: loadingSemana,
        error: errorSemana,
    } = trpc.dashboard.getApontamentosPorSemana.useQuery(
        {
            projectId: projectId!,
            edificacao: queryParams.edificacao,
        },
        {
            enabled: !!projectId && normalizedTipo === "semana",
            retry: false,
        }
    );

    const {
        data: disciplinaData = [],
        isLoading: loadingDisciplina,
        error: errorDisciplina,
    } = trpc.dashboard.getApontamentosPorDisciplina.useQuery(
        {
            projectId: projectId!,
            edificacao: queryParams.edificacao,
        },
        {
            enabled: !!projectId && normalizedTipo === "disciplina",
            retry: false,
        }
    );

    const {
        data: asBuiltSummary,
        isLoading: loadingAsBuilt,
        error: errorAsBuilt,
    } = trpc.analytics.getAsBuiltModelsSummary.useQuery(
        {
            projectId: projectId!,
            empresa: queryParams.empresa,
        },
        {
            enabled:
                !!projectId &&
                (normalizedTipo === "asbuilt-edificacoes" || normalizedTipo === "asbuilt-painel"),
            retry: false,
        }
    );

    const {
        data: kpis,
        isLoading: loadingKpis,
        error: errorKpis,
    } = trpc.analytics.getKPIsPorEdificacao.useQuery(
        {
            projectId: projectId!,
            edificacao: queryParams.edificacao || "Geral",
        },
        {
            enabled:
                !!projectId &&
                (normalizedTipo === "card" || normalizedTipo === "cards-row"),
            retry: false,
        }
    );

    const isLoading = loadingSemana || loadingDisciplina || loadingAsBuilt || loadingKpis;
    const error = errorSemana || errorDisciplina || errorAsBuilt || errorKpis;

    if (error) {
        return (
            <div
                data-export-error="true"
                className="p-6 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl m-4 font-sans"
            >
                Erro ao carregar gráfico de exportação: {error.message}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#9C1915]" />
            </div>
        );
    }

    if (normalizedTipo === "card") {
        const indicador = queryParams.indicador || "taxa_verificacao";
        const width = queryParams.width || 230;
        const height = queryParams.height || 100;

        let title = "TAXA VERIFICAÇÃO";
        let value: React.ReactNode = `${kpis?.taxaVerificacao?.toFixed(1) || 0}%`;
        let subtitle: React.ReactNode = `${kpis?.salasVerificadas || 0} verificadas`;
        let icon = Smartphone;
        let variant: "default" | "green" | "red" | "blue" = "green";

        if (indicador === "salas_verificadas" || indicador === "verificadas") {
            title = "SALAS VERIFICADAS";
            value = kpis?.salasVerificadas || 0;
            subtitle = (
                <span>
                    <span className="text-emerald-600 font-bold">
                        {kpis?.taxaVerificacao?.toFixed(1) || 0}%
                    </span>{" "}
                    do total
                </span>
            );
            icon = CheckCircle2;
            variant = "green";
        } else if (indicador === "total" || indicador === "total_salas") {
            title = "TOTAL DE SALAS";
            value = kpis?.totalSalas || 0;
            subtitle = queryParams.edificacao || "Obra Geral";
            icon = LayoutDashboard;
            variant = "default";
        } else if (indicador === "apontamentos") {
            title = "TOTAL APONTAMENTOS";
            value = kpis?.totalApontamentos || 0;
            subtitle = `${Number(kpis?.mediaApontamentos || 0).toFixed(1)} média/sala`;
            icon = Database;
            variant = (kpis?.totalApontamentos || 0) > 0 ? "red" : "default";
        } else if (indicador === "forro") {
            title = "SALAS C/ FORRO";
            value = kpis?.salasVerificadasComForro || 0;
            subtitle = (
                <span>
                    <span className="text-emerald-600 font-bold">
                        {Number(kpis?.percentualForroVerificadas || 0).toFixed(1)}%
                    </span>{" "}
                    do total
                </span>
            );
            icon = Layers;
            variant = "default";
        } else if (indicador === "liberado") {
            title = "LIBERADO P/ OBRA";
            value = `${kpis?.taxaLiberacao?.toFixed(1) || 0}%`;
            subtitle = `${kpis?.salasLiberadas || 0} liberadas`;
            icon = Box;
            variant = "green";
        } else if (indicador === "resumo") {
            title = (queryParams.edificacao || "OBRA").toUpperCase();
            value = `${kpis?.taxaVerificacao?.toFixed(1) || 0}%`;
            subtitle = `${kpis?.salasVerificadas || 0}/${kpis?.totalSalas || 0} salas verificadas`;
            icon = Building2;
            variant = "green";
        }

        return (
            <div
                id="export-chart-container"
                data-export-ready="true"
                data-chart-type="card"
                className="bg-transparent inline-block font-sans p-1"
                style={{ width, height }}
            >
                <KPICard
                    title={title}
                    value={value}
                    subtitle={subtitle}
                    icon={icon}
                    variant={variant}
                    className="shadow-sm border-slate-200/90 h-full"
                />
            </div>
        );
    }

    if (normalizedTipo === "cards-row") {
        const width = queryParams.width || 860;
        const height = queryParams.height || 105;
        const edifName = queryParams.edificacao || "Obra Geral";

        return (
            <div
                id="export-chart-container"
                data-export-ready="true"
                data-chart-type="cards-row"
                className="bg-transparent inline-block font-sans p-1"
                style={{ width, height }}
            >
                <div className="grid grid-cols-4 gap-3 h-full">
                    <KPICard
                        title="TOTAL DE SALAS"
                        value={kpis?.totalSalas || 0}
                        subtitle={edifName}
                        icon={LayoutDashboard}
                        variant="default"
                    />
                    <KPICard
                        title="SALAS VERIFICADAS"
                        value={kpis?.salasVerificadas || 0}
                        subtitle={
                            <span>
                                <span className="text-emerald-600 font-bold">
                                    {kpis?.taxaVerificacao?.toFixed(1) || 0}%
                                </span>{" "}
                                do total
                            </span>
                        }
                        icon={CheckCircle2}
                        variant="green"
                    />
                    <KPICard
                        title="TOTAL DE APONTAMENTOS"
                        value={kpis?.totalApontamentos || 0}
                        subtitle={`${Number(kpis?.mediaApontamentos || 0).toFixed(1)} média/sala`}
                        icon={Database}
                        variant={(kpis?.totalApontamentos || 0) > 0 ? "red" : "default"}
                    />
                    <KPICard
                        title="SALAS C/ FORRO VERIFICADAS"
                        value={kpis?.salasVerificadasComForro || 0}
                        subtitle={
                            <span>
                                <span className="text-emerald-600 font-bold">
                                    {Number(kpis?.percentualForroVerificadas || 0).toFixed(1)}%
                                </span>{" "}
                                do total
                            </span>
                        }
                        icon={Layers}
                        variant="default"
                    />
                </div>
            </div>
        );
    }

    if (normalizedTipo === "semana") {
        const width = queryParams.width || 774;
        const height = queryParams.height || 332;
        return (
            <div
                id="export-chart-container"
                data-export-ready="true"
                data-chart-type="semana"
                className="bg-white inline-block font-sans"
                style={{ width, height }}
            >
                <ApontamentosPorSemanaChart
                    data={semanaData}
                    exportMode={true}
                    exportDimensions={{ width, height }}
                />
            </div>
        );
    }

    if (normalizedTipo === "disciplina") {
        const width = queryParams.width || 380;
        const height = queryParams.height || 332;
        return (
            <div
                id="export-chart-container"
                data-export-ready="true"
                data-chart-type="disciplina"
                className="bg-white inline-block font-sans"
                style={{ width, height }}
            >
                <ApontamentosPorDisciplinaChart
                    data={disciplinaData}
                    exportMode={true}
                    exportDimensions={{ width, height }}
                />
            </div>
        );
    }

    if (normalizedTipo === "asbuilt-edificacoes") {
        const width = queryParams.width || 580;
        const height = queryParams.height || 360;
        const edificacoesData = asBuiltSummary?.statusPorEdificacao || [];

        return (
            <div
                id="export-chart-container"
                data-export-ready="true"
                data-chart-type="asbuilt-edificacoes"
                className="bg-white inline-block font-sans"
                style={{ width, height }}
            >
                <Card
                    className="border border-slate-200 bg-white rounded-2xl shadow-xs overflow-hidden flex flex-col"
                    style={{ width, height }}
                >
                    <CardHeader className="p-4 pb-2.5 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-600" />
                            Status por Edificação ({queryParams.empresa})
                        </CardTitle>

                        <div className="flex items-center gap-2.5 text-[10px] font-semibold text-[#6C6A6A]">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Validado
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Pendente
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#9C1915]" /> Igual Projeto
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" /> Não entregue
                            </span>
                        </div>
                    </CardHeader>

                    <CardContent className="p-5 flex-1 flex flex-col justify-between gap-2.5">
                        {edificacoesData.map((edif: any) => {
                            const total = edif.total || 1;
                            const entreguesEdif = edif.total - edif.naoEntregue;
                            const pValid = (edif.validado / total) * 100;
                            const pPend = (edif.pendente / total) * 100;
                            const pIgual = (edif.igualProjeto / total) * 100;
                            const pNao = (edif.naoEntregue / total) * 100;

                            return (
                                <div key={edif.edificacao} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-700">
                                            {edif.edificacao}
                                        </span>
                                        <span className="font-bold text-slate-500 text-[11px]">
                                            {entreguesEdif}/{edif.total} entregues
                                        </span>
                                    </div>

                                    <div className="h-5 w-full bg-slate-100 rounded-md overflow-hidden flex">
                                        {edif.validado > 0 && (
                                            <div
                                                style={{ width: `${pValid}%` }}
                                                className="bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center"
                                            >
                                                {edif.validado}
                                            </div>
                                        )}
                                        {edif.pendente > 0 && (
                                            <div
                                                style={{ width: `${pPend}%` }}
                                                className="bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center"
                                            >
                                                {edif.pendente}
                                            </div>
                                        )}
                                        {edif.igualProjeto > 0 && (
                                            <div
                                                style={{ width: `${pIgual}%` }}
                                                className="bg-[#9C1915] text-white text-[10px] font-bold flex items-center justify-center"
                                            >
                                                {edif.igualProjeto}
                                            </div>
                                        )}
                                        {edif.naoEntregue > 0 && (
                                            <div
                                                style={{ width: `${pNao}%` }}
                                                className="bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center"
                                            >
                                                {edif.naoEntregue}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>

                    <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </Card>
            </div>
        );
    }

    // Default for "asbuilt-painel": Full Executive Summary for the selected contractor
    const width = queryParams.width || 1160;
    return (
        <div
            id="export-chart-container"
            data-export-ready="true"
            data-chart-type="asbuilt-painel"
            className="bg-slate-50 p-4 inline-block font-sans"
            style={{ width }}
        >
            <AsBuiltModelsExecutiveSummary
                projectId={projectId!}
                initialEmpresa={queryParams.empresa}
                exportMode={true}
            />
        </div>
    );
}
