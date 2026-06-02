/*
 * ESTE ARQUIVO É A TELA PRINCIPAL (PAINEL GERAL).
 * Ele organiza as abas que você vê na tela. 
 * Eu adicionei a nova aba "Status As-Built" para que você possa alternar entre o controle de obra e o controle de entrega de modelos.
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
    Loader2,
    LayoutDashboard,
    Database,
    FileText,
    FileSpreadsheet,
    Info,
    Smartphone,
    CheckCircle,
    Settings,
    CalendarDays,
    AlertCircle,
    Layers,
    Box
} from "lucide-react";
import { toast } from "sonner";

// Components
import KPICard from "@/components/dashboard/KPICard";
import EdificacaoSelector from "@/components/dashboard/EdificacaoSelector";
import ApontamentosPorSalaChart from "@/components/charts/ApontamentosPorSalaChart";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import StatusPieChart from "@/components/charts/StatusPieChart";
import TopImpactedRooms from "@/components/dashboard/TopImpactedRooms";
import SimuladorTendenciaCard from "@/components/dashboard/SimuladorTendenciaCard";
import DataHubTab from "@/components/dashboard/DataHubTab";
import DataIntegrityAlert from "@/components/dashboard/DataIntegrityAlert";
import EntregasTab from "@/components/dashboard/EntregasTab";
import AsBuiltDashboard from "@/components/dashboard/AsBuiltDashboard";
import FieldReportTab from "@/components/dashboard/FieldReportTab";
import IssueManagerTab from "@/components/dashboard/IssueManagerTab";
import StatusDetailsModal from "@/components/dashboard/StatusDetailsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ROLE_BADGES = {
    owner: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    admin: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    viewer: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    parceiro: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const ROLE_LABELS = {
    owner: 'Proprietário',
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
    parceiro: 'Parceiro',
};

export default function Dashboard() {
    const { id: projectId } = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const [selectedEdificacao, setSelectedEdificacao] = useState<string | null>(null);
    
    // User role check
    const { role: projectRole, isAdmin, isParceiro, isLoading: roleLoading } = useProjectRole(projectId);
    
    // Persistir aba ativa no refresh
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('dashboard_active_tab') || 'overview');

    // Auto switch to issues tab for third party partners
    useEffect(() => {
        if (isParceiro && activeTab !== 'issues') {
            setActiveTab('issues');
            sessionStorage.setItem('dashboard_active_tab', 'issues');
        }
    }, [isParceiro, activeTab]);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        sessionStorage.setItem('dashboard_active_tab', val);
    };
    
    // Status Modal State
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [selectedStatusColor, setSelectedStatusColor] = useState<string>("#94a3b8");

    // Estados para simulação (dados que vêm do simulador no final da página)
    const [simulatedData, setSimulatedData] = useState<{ targetDate: string; roomsPerWeek: number } | null>(null);

    const { data: project } = trpc.projects.getById.useQuery(
        { id: projectId! },
        { enabled: !!projectId }
    );

    const downloadBase64 = (base64: string, fileName: string, contentType: string) => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Data fetching
    const { data: globalKpis, isLoading: kpisLoading } = trpc.dashboard.getKPIs.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId }
    );
    const { data: filteredKpis } = trpc.dashboard.getKPIsPorEdificacao.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || "" },
        { enabled: !!projectId && !!selectedEdificacao }
    );

    const { data: chartSala = [] } = trpc.dashboard.getApontamentosPorSala.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId }
    );
    const { data: chartSemana = [] } = trpc.dashboard.getApontamentosPorSemana.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || undefined },
        { enabled: !!projectId }
    );
    const { data: chartDisciplina = [] } = trpc.dashboard.getApontamentosPorDisciplina.useQuery(
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
    const { data: chartTendenciaGeral = [] } = trpc.dashboard.getTendenciaVerificacao.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId && !selectedEdificacao }
    );
    const { data: chartTendenciaFiltrada = [] } = trpc.dashboard.getTendenciaVerificacaoPorEdificacao.useQuery(
        { projectId: projectId!, edificacao: selectedEdificacao || "" },
        { enabled: !!projectId && !!selectedEdificacao }
    );
    const tendenciaData = selectedEdificacao ? chartTendenciaFiltrada : chartTendenciaGeral;

    const utils = trpc.useUtils();


    const kpis: any = selectedEdificacao && filteredKpis ? filteredKpis : globalKpis;
    const isLoading = kpisLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando dados do dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50/50">
            <div className="max-w-[1600px] mx-auto p-4 md:px-8 md:py-6 space-y-5">

                <DataIntegrityAlert projectId={projectId!} />

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <TabsList className="bg-white border p-1 h-12 shadow-sm overflow-x-auto flex-nowrap whitespace-nowrap flex-1">
                            {!isParceiro && (
                                <>
                                    <TabsTrigger value="overview" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Visão Geral
                                    </TabsTrigger>
                                    <TabsTrigger value="data" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        <Database className="w-4 h-4 mr-2" />
                                        Tabelas e Dados
                                    </TabsTrigger>
                                    <TabsTrigger value="field" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        <Smartphone className="w-4 h-4 mr-2" />
                                        Relato de Campo
                                    </TabsTrigger>
                                    <TabsTrigger value="asbuilt" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Status As-Built
                                    </TabsTrigger>
                                    <TabsTrigger value="entregas" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Gestão de Entregas e Escopo
                                    </TabsTrigger>
                                </>
                            )}
                            <TabsTrigger value="issues" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Painel de Divergências
                            </TabsTrigger>
                        </TabsList>

                        <div className="shrink-0">
                            <EdificacaoSelector
                                projectId={projectId!}
                                selectedEdificacao={selectedEdificacao}
                                onSelect={setSelectedEdificacao}
                            />
                        </div>
                    </div>

                    <TabsContent value="data" className="animate-in fade-in duration-500">
                        <DataHubTab projectId={projectId!} />
                    </TabsContent>

                    <TabsContent value="field" className="animate-in fade-in duration-500">
                        <FieldReportTab projectId={projectId!} />
                    </TabsContent>

                    <TabsContent value="issues" className="animate-in fade-in duration-500">
                        <IssueManagerTab projectId={projectId!} />
                    </TabsContent>

                    <TabsContent value="entregas" className="animate-in fade-in duration-500">
                        <EntregasTab projectId={projectId!} selectedEdificacao={selectedEdificacao || undefined} />
                    </TabsContent>

                        <TabsContent value="asbuilt" className="m-0">
                            <AsBuiltDashboard projectId={projectId!} selectedEdificacao={selectedEdificacao} />
                        </TabsContent>

                    <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
                        {/* KPIs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            <KPICard
                                title="Salas Mapeadas"
                                value={kpis?.totalSalas || 0}
                                subtitle="Total de salas registradas"
                                icon={LayoutDashboard}
                                variant="blue"
                            />
                            <KPICard
                                title="Liberado para Obra"
                                value={`${kpis?.taxaLiberacao?.toFixed(1) || 0}%`}
                                subtitle={`${kpis?.salasLiberadas || 0} salas liberadas`}
                                icon={Box}
                                variant="green"
                            />
                            <KPICard
                                title="Taxa de Verificação"
                                value={`${kpis?.taxaVerificacao?.toFixed(1) || 0}%`}
                                subtitle={`${kpis?.salasVerificadas || 0} salas verificadas`}
                                icon={Smartphone}
                                variant="orange"
                            />
                            <KPICard
                                title="Total Apontamentos"
                                value={kpis?.totalApontamentos || 0}
                                subtitle={`${kpis?.mediaApontamentos?.toFixed(1) || 0} média por sala`}
                                icon={Database}
                                variant="red"
                            />
                            <KPICard
                                title="Salas com Forro"
                                value={kpis?.salasComForro ?? 0}
                                subtitle={
                                    <div className="flex flex-col gap-0.5">
                                        <span>{kpis?.salasVerificadasComForro ?? 0} verificadas</span>
                                        <span className="text-[10px] font-bold" style={{ color: '#0d9488' }}>
                                            {kpis?.percentualForroVerificadas != null
                                                ? `${kpis.percentualForroVerificadas.toFixed(1)}% das c/ forro verificadas`
                                                : 'Sem dados'}
                                        </span>
                                    </div>
                                }
                                icon={Layers}
                                variant="default"
                                className="border-l-4 border-teal-500"
                            />
                            <KPICard
                                title="Previsão Término"
                                value={
                                    simulatedData?.targetDate 
                                        ? new Date(simulatedData.targetDate + "T12:00:00").toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})
                                        : kpis?.estimativaTermino 
                                            ? new Date(kpis.estimativaTermino).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) 
                                            : "..."
                                }
                                subtitle={
                                    <div className="flex flex-col gap-0.5">
                                        <span className={simulatedData ? "text-primary font-bold" : ""}>
                                            {simulatedData 
                                                ? `${(simulatedData.roomsPerWeek / 5).toFixed(1)} salas/dia (Simulado)` 
                                                : kpis?.velocidadeVerificacao > 0 
                                                    ? `${kpis.velocidadeVerificacao.toFixed(1)} salas/dia` 
                                                    : "Aguardando dados"}
                                        </span>
                                        {project?.baselineTargetDate && (
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                Meta: {new Date(project.baselineTargetDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                }
                                icon={CalendarDays}
                                variant={simulatedData ? "blue" : "default"}
                            />
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <ApontamentosPorSemanaChart data={chartSemana} />
                            </div>
                            <div className="xl:col-span-1 border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
                                <StatusPieChart 
                                    data={chartStatus} 
                                    onStatusClick={(status, color) => {
                                        setSelectedStatus(status);
                                        setSelectedStatusColor(color);
                                        setIsStatusModalOpen(true);
                                    }}
                                />
                            </div>

                            {/* Status Details Modal */}
                            {selectedStatus && (
                                <StatusDetailsModal
                                    isOpen={isStatusModalOpen}
                                    onClose={() => setIsStatusModalOpen(false)}
                                    statusName={selectedStatus}
                                    color={selectedStatusColor}
                                    rooms={(salas || [])
                                        .filter((s: any) => {
                                            const matchesStatus = s.status?.trim().toUpperCase() === selectedStatus.toUpperCase();
                                            const matchesEdificacao = !selectedEdificacao || s.edificacao === selectedEdificacao;
                                            return matchesStatus && matchesEdificacao;
                                        })
                                        .map((s: any) => ({
                                            id: s.id,
                                            nome: s.nome || "S/ Nome",
                                            edificacao: s.edificacao || "S/ Edif",
                                            pavimento: s.pavimento || "S/ Pav",
                                            status: s.status
                                        }))
                                    }
                                />
                            )}

                            {/* Simulador de Tendência Interativo */}
                            <SimuladorTendenciaCard 
                                data={tendenciaData} 
                                allRooms={salas || []}
                                projectId={projectId}
                                project={project}
                                // Função para atualizar os dados no topo do dashboard
                                onSimulationChange={(sim) => setSimulatedData(sim)}
                            />
                            <div className="xl:col-span-2">
                                <TopImpactedRooms data={topSalas} />
                            </div>
                            <div className="xl:col-span-1">
                                <ApontamentosPorDisciplinaChart data={chartDisciplina} />
                            </div>
                            <div className="lg:col-span-2 xl:col-span-3">
                                <ApontamentosPorSalaChart data={chartSala} />
                            </div>
                        </div>
                    </TabsContent>



                </Tabs>
            </div>
        </div>
    );
}
