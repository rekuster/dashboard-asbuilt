import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
    AlertTriangle,
    Building2,
    Calendar,
    Users,
    Trash2,
    Box
} from "lucide-react";
import { toast } from "sonner";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import SimuladorTendenciaCard from "@/components/dashboard/SimuladorTendenciaCard";
import TopImpactedRooms from "@/components/dashboard/TopImpactedRooms";
// import IfcViewer from "@/components/ifc/IfcViewer";

interface PresentationTabProps {
    projectId: string;
    edificacao: string | null;
    activeModelUrl?: string;
    ifcFiles: any[];
    onSelectModel: (url: string) => void;
}

export default function PresentationTab({
    projectId,
    edificacao,
    activeModelUrl,
    ifcFiles,
    onSelectModel,
}: PresentationTabProps) {
    const { data: globalKpis } = trpc.dashboard.getKPIs.useQuery({ projectId });
    const { data: filteredKpis } = trpc.dashboard.getKPIsPorEdificacao.useQuery(
        { projectId, edificacao: edificacao || "" },
        { enabled: !!edificacao }
    );

    const { data: chartSemana = [] } = trpc.dashboard.getApontamentosPorSemana.useQuery(
        { projectId, edificacao: edificacao || undefined }
    );
    const { data: chartDisciplina = [] } = trpc.dashboard.getApontamentosPorDisciplina.useQuery(
        { projectId, edificacao: edificacao || undefined }
    );
    const { data: topSalas = [] } = trpc.dashboard.getTopSalasImpactadas.useQuery(
        { projectId, edificacao: edificacao || undefined }
    );
    const allSalasQuery = trpc.dashboard.getAllSalas.useQuery({ projectId });
    const { data: chartTendenciaGeral = [] } = trpc.dashboard.getTendenciaVerificacao.useQuery(
        { projectId },
        { enabled: !edificacao }
    );
    const { data: chartTendenciaFiltrada = [] } = trpc.dashboard.getTendenciaVerificacaoPorEdificacao.useQuery(
        { projectId, edificacao: edificacao || "" },
        { enabled: !!edificacao }
    );
    const tendenciaData = edificacao ? chartTendenciaFiltrada : chartTendenciaGeral;

    const utils = trpc.useUtils();
    const deleteMutation = trpc.ifc.deleteFile.useMutation({
        onSuccess: () => {
            toast.success("Modelo excluído com sucesso!");
            utils.ifc.getAllFiles.invalidate();
            utils.ifc.getFilesByEdificacao.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir modelo: ${err.message}`);
        }
    });

    const handleDeleteModel = async (id: number, name: string) => {
        if (confirm(`Tem certeza que deseja excluir o modelo "${name}"? Esta ação não pode ser desfeita.`)) {
            await deleteMutation.mutateAsync({ projectId, fileId: id });
            if (activeModelUrl && activeModelUrl.includes(name)) {
                onSelectModel(""); // Clear selection if deleted
            }
        }
    };

    const kpis: any = edificacao && filteredKpis ? filteredKpis : globalKpis;

    return (
        <div className="bg-white p-8 rounded-none shadow-none min-h-[900px] flex flex-col gap-6 border border-slate-100 overflow-hidden" id="presentation-slide">
            {/* Header / Branding */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Acompanhamento 3D / As Built
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-slate-500 font-medium">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="text-sm uppercase tracking-widest font-bold">{edificacao || 'GERAL - TODAS AS EDIFICAÇÕES'}</span>
                    </div>
                </div>
                <img
                    src="/logos_stecla/versao_horizontal@4x.png"
                    alt="Stecla Engenharia"
                    className="h-10 object-contain"
                />
            </div>

            {/* Top Row: Main KPIs */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-slate-50 border-none shadow-sm rounded-xl p-4 border-l-4 border-slate-300">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total de Salas</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">{kpis?.totalSalas || 0}</span>
                        <span className="text-slate-400 font-medium text-xs">{edificacao || 'Geral'}</span>
                    </div>
                </Card>

                <Card className="bg-emerald-50/50 border-none shadow-sm rounded-xl p-4 border-l-4 border-emerald-500">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1 font-black">Salas Verificadas</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">{kpis?.salasVerificadas || 0}</span>
                        <span className="text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                            {kpis?.taxaVerificacao?.toFixed(1) || 0}%
                        </span>
                    </div>
                </Card>

                <Card className="bg-rose-50/50 border-none shadow-sm rounded-xl p-4 border-l-4 border-rose-500">
                    <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1 font-black">Total de Apontamentos</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">{kpis?.totalApontamentos || 0}</span>
                        <span className="text-rose-600 font-medium text-xs">{kpis?.mediaApontamentos?.toFixed(1) || 0} p/ sala</span>
                    </div>
                </Card>

                <Card className="bg-purple-50/50 border-none shadow-sm rounded-xl p-4 border-l-4 border-purple-500">
                    <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-1 font-black">Previsão Término</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">
                            {kpis?.estimativaTermino ? new Date(kpis.estimativaTermino).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : "..."}
                        </span>
                        <span className="text-purple-600 font-medium text-[11px]">
                            {kpis?.velocidadeVerificacao > 0 ? `${kpis.velocidadeVerificacao.toFixed(1)} s/dia` : "Aguardando"}
                        </span>
                    </div>
                </Card>
            </div>

            {/* Middle Section: 3D View and Trends */}
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-[500px]">
                {/* 3D Visualization (7/12) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-100 flex items-center justify-center relative h-[450px]">
                        {/* <IfcViewer modelUrl={activeModelUrl} /> */}
                        <div className="text-center p-8">
                            <Box className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Visualizador 3D Temporariamente Desativado</p>
                            <p className="text-slate-400 text-xs mt-1">Aguardando ajustes de compatibilidade para o deploy.</p>
                        </div>
                    </div>

                    {/* Model Selector temporarily hidden
                    <div className="grid grid-cols-2 gap-4">
                        ...
                    </div>
                    */}
                </div>

                {/* Right Column: Trend and Disclipine (5/12) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                    <Card className="flex-1 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-5">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Apontamentos por Semana
                        </h2>
                        <div className="h-[320px] pt-4">
                            <ApontamentosPorSemanaChart data={chartSemana} hideTitle />
                        </div>
                    </Card>

                    <Card className="flex-1 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden p-5">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            Apontamentos por Disciplina
                        </h2>
                        <div className="h-[320px] pt-4">
                            <ApontamentosPorDisciplinaChart data={chartDisciplina} hideTitle />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Middle Section 2: Tendency Chart (Full Width) */}
            <div className="w-full">
                <SimuladorTendenciaCard 
                    data={tendenciaData} 
                    allRooms={allSalasQuery.data || []}
                />
            </div>

            {/* Bottom Row: Top Impacted Rooms */}
            <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                    Salas com mais Apontamentos no Modelo
                </h2>
                <TopImpactedRooms data={topSalas} hideTitle />
            </Card>
        </div>
    );
}
