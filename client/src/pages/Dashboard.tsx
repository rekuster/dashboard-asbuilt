import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useLayout } from "@/contexts/LayoutContext";
import {
    Loader2,
    LayoutDashboard,
    Database,
    Smartphone,
    CalendarDays,
    Layers,
    Box,
} from "lucide-react";

// Components
import KPICard from "@/components/dashboard/KPICard";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import StatusPieChart from "@/components/charts/StatusPieChart";
import TopImpactedRooms from "@/components/dashboard/TopImpactedRooms";
import DataHubTab from "@/features/data-hub/DataHubTab";
import DataIntegrityAlert from "@/components/dashboard/DataIntegrityAlert";
import EntregasTab from "@/features/deliveries/EntregasTab";
import FieldReportTab from "@/features/field-reports/FieldReportTab";
import IssueManagerTab from "@/features/issues/IssueManagerTab";
import DesignerPortalTab from "@/features/designer-portal/DesignerPortalTab";
import StatusDetailsModal from "@/components/dashboard/StatusDetailsModal";
import AsBuiltModelsExecutiveSummary from "@/components/dashboard/AsBuiltModelsExecutiveSummary";

export default function Dashboard() {
    const { id: projectId } = useParams<{ id: string }>();
    const { activeTab, setActiveTab, selectedEdificacao } = useLayout();
    const { isParceiro } = useProjectRole(projectId);

    useEffect(() => {
        if (isParceiro && activeTab !== "portal-projetista" && activeTab !== "issues") {
            setActiveTab("portal-projetista");
        }
    }, [isParceiro, activeTab, setActiveTab]);

    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [selectedStatusColor, setSelectedStatusColor] = useState<string>("#6C6A6A");

    const { data: project } = trpc.projects.getById.useQuery(
        { id: projectId! },
        { enabled: !!projectId }
    );

    const { data: globalKpis, isLoading: kpisLoading } = trpc.dashboard.getKPIs.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId }
    );
    const { data: filteredKpis } = trpc.dashboard.getKPIsPorEdificacao.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || "" },
        { enabled: !!projectId && !!selectedEdificacao }
    );

    const { data: chartSemana = [] } = trpc.dashboard.getApontamentosPorSemana.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || undefined },
        { enabled: !!projectId }
    );
    const { data: chartDisciplina = [] } =
        trpc.dashboard.getApontamentosPorDisciplina.useQuery(
            { projectId: projectId!, edificacao: selectedEdificacao || undefined },
            { enabled: !!projectId }
        );
    const { data: chartStatus = [] } = trpc.dashboard.getStatsStatus.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || undefined },
        { enabled: !!projectId }
    );
    const { data: topSalas = [] } = trpc.dashboard.getTopSalasImpactadas.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || undefined },
        { enabled: !!projectId }
    );
    const { data: salas = [] } = trpc.dashboard.getAllSalas.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId }
    );

    const kpis: any =
        selectedEdificacao && filteredKpis ? filteredKpis : globalKpis;

    return (
        <div className="space-y-3.5">
            <DataIntegrityAlert projectId={projectId!} />

            {/* View: Central de Dados */}
            {activeTab === "data-hub" && (
                <div className="animate-in fade-in duration-150">
                    <DataHubTab projectId={projectId!} />
                </div>
            )}

            {/* View: Relatório de Campo */}
            {activeTab === "field-reports" && (
                <div className="animate-in fade-in duration-150">
                    <FieldReportTab projectId={projectId!} />
                </div>
            )}

            {/* View: Apontamentos & Divergências */}
            {activeTab === "issues" && (
                <div className="animate-in fade-in duration-150">
                    <IssueManagerTab projectId={projectId!} />
                </div>
            )}

            {/* View: Entregas As-Built */}
            {activeTab === "deliveries" && (
                <div className="animate-in fade-in duration-150">
                    <EntregasTab
                        projectId={projectId!}
                        selectedEdificacao={selectedEdificacao || undefined}
                    />
                </div>
            )}

            {/* View: Portal As-Built (Portal do Projetista) */}
            {activeTab === "portal-projetista" && (
                <div className="animate-in fade-in duration-150">
                    <DesignerPortalTab
                        projectId={projectId!}
                        selectedEdificacao={selectedEdificacao || undefined}
                    />
                </div>
            )}

            {/* View: Visão Geral (Overview) */}
            {activeTab === "overview" && (
                kpisLoading && !kpis ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="animate-spin w-7 h-7 text-[#9C1915]" />
                        <p className="text-slate-400 text-xs font-medium animate-pulse">
                            Carregando indicadores da plataforma...
                        </p>
                    </div>
                ) : (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                    {/* KPIs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <KPICard
                            title="Salas Mapeadas"
                            value={kpis?.totalSalas || 0}
                            subtitle="Total de salas registradas"
                            icon={LayoutDashboard}
                        />
                        <KPICard
                            title="Liberado p/ Obra"
                            value={`${kpis?.taxaLiberacao?.toFixed(1) || 0}%`}
                            subtitle={`${kpis?.salasLiberadas || 0} salas liberadas`}
                            icon={Box}
                        />
                        <KPICard
                            title="Taxa Verificação"
                            value={`${kpis?.taxaVerificacao?.toFixed(1) || 0}%`}
                            subtitle={`${kpis?.salasVerificadas || 0} verificadas`}
                            icon={Smartphone}
                        />
                        <KPICard
                            title="Apontamentos"
                            value={kpis?.totalApontamentos || 0}
                            subtitle={`${kpis?.mediaApontamentos?.toFixed(1) || 0} média/sala`}
                            icon={Database}
                            variant="red"
                        />
                        <KPICard
                            title="Salas c/ Forro"
                            value={kpis?.salasComForro ?? 0}
                            subtitle={`${kpis?.salasVerificadasComForro ?? 0} verificadas`}
                            icon={Layers}
                        />
                        <KPICard
                            title="Previsão Término"
                            value={
                                kpis?.estimativaTermino
                                    ? new Date(
                                          kpis.estimativaTermino
                                      ).toLocaleDateString("pt-BR", {
                                          day: "2-digit",
                                          month: "short",
                                      })
                                    : "..."
                            }
                            subtitle={
                                kpis?.velocidadeVerificacao > 0
                                    ? `${kpis.velocidadeVerificacao.toFixed(
                                          1
                                      )} salas/dia`
                                    : "Aguardando dados"
                            }
                            icon={CalendarDays}
                        />
                    </div>

                    {/* Linha 1 de Gráficos: Tendência Semanal + Distribuição de Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        <div className="lg:col-span-2">
                            <ApontamentosPorSemanaChart data={chartSemana} />
                        </div>
                        <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden flex flex-col">
                            <StatusPieChart
                                data={chartStatus}
                                onStatusClick={(status, color) => {
                                    setSelectedStatus(status);
                                    setSelectedStatusColor(color);
                                    setIsStatusModalOpen(true);
                                }}
                            />
                        </div>
                    </div>

                    {/* Linha 2 de Gráficos: Salas Mais Impactadas + Apontamentos por Disciplina */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        <div className="lg:col-span-2">
                            <TopImpactedRooms data={topSalas} />
                        </div>
                        <div className="lg:col-span-1">
                            <ApontamentosPorDisciplinaChart data={chartDisciplina} />
                        </div>
                    </div>

                    {/* SEÇÃO EXECUTIVA: STATUS DOS MODELOS AS-BUILT (APRESENTAÇÃO STECLA) */}
                    <AsBuiltModelsExecutiveSummary projectId={projectId!} />

                    {/* Status Details Modal */}
                    {selectedStatus && (
                        <StatusDetailsModal
                            isOpen={isStatusModalOpen}
                            onClose={() => setIsStatusModalOpen(false)}
                            statusName={selectedStatus}
                            color={selectedStatusColor}
                            rooms={(salas || [])
                                .filter((s: any) => {
                                    const matchesStatus =
                                        s.status?.trim().toUpperCase() ===
                                        selectedStatus.toUpperCase();
                                    const matchesEdificacao =
                                        !selectedEdificacao ||
                                        s.edificacao === selectedEdificacao;
                                    return matchesStatus && matchesEdificacao;
                                })
                                .map((s: any) => ({
                                    id: s.id,
                                    nome: s.nome || "S/ Nome",
                                    edificacao: s.edificacao || "S/ Edif",
                                    pavimento: s.pavimento || "S/ Pav",
                                    status: s.status,
                                }))}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
