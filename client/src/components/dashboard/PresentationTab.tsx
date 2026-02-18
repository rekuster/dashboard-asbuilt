import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
    AlertTriangle,
    Building2,
    Calendar,
    Users,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ApontamentosPorSemanaChart from "@/components/charts/ApontamentosPorSemanaChart";
import ApontamentosPorDisciplinaChart from "@/components/charts/ApontamentosPorDisciplinaChart";
import TopImpactedRooms from "@/components/dashboard/TopImpactedRooms";
import IfcViewer from "@/components/ifc/IfcViewer";

interface PresentationTabProps {
    edificacao: string | null;
    activeModelUrl?: string;
    ifcFiles: any[];
    onSelectModel: (url: string) => void;
}

export default function PresentationTab({
    edificacao,
    activeModelUrl,
    ifcFiles,
    onSelectModel,
}: PresentationTabProps) {
    const { data: globalKpis } = trpc.dashboard.getKPIs.useQuery();
    const { data: filteredKpis } = trpc.dashboard.getKPIsPorEdificacao.useQuery(
        { edificacao: edificacao || "" },
        { enabled: !!edificacao }
    );

    const { data: chartSemana = [] } = trpc.dashboard.getApontamentosPorSemana.useQuery(
        { edificacao: edificacao || undefined }
    );
    const { data: chartDisciplina = [] } = trpc.dashboard.getApontamentosPorDisciplina.useQuery(
        { edificacao: edificacao || undefined }
    );
    const { data: topSalas = [] } = trpc.dashboard.getTopSalasImpactadas.useQuery(
        { edificacao: edificacao || undefined }
    );

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
            await deleteMutation.mutateAsync({ fileId: id });
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
            <div className="grid grid-cols-3 gap-4">
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
            </div>

            {/* Middle Section: 3D View and Trends */}
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-[500px]">
                {/* 3D Visualization (7/12) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
                    <div className="flex-1 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-950 relative min-h-[400px]">
                        <IfcViewer modelUrl={activeModelUrl} />
                    </div>

                    {/* Model Selector BELOW 3D Viewer */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-slate-50 border-slate-200 shadow-none">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Modelos Disponíveis</h3>
                            <div className="flex flex-wrap gap-2">
                                {ifcFiles.map((file: any) => (
                                    <div key={file.id} className="group relative flex items-center">
                                        <button
                                            onClick={() => onSelectModel(file.filePath)}
                                            className={`px-3 py-1.5 pr-2 rounded-lg text-xs font-medium transition-all border flex items-center gap-2 ${activeModelUrl === file.filePath
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                                                }`}
                                        >
                                            {file.fileName}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteModel(file.id, file.fileName);
                                            }}
                                            className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                            title="Excluir modelo"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {ifcFiles.length === 0 && <span className="text-[10px] text-slate-400 italic">Nenhum modelo carregado</span>}
                            </div>
                        </Card>
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex flex-col justify-center">
                            <h4 className="text-[9px] font-bold text-primary uppercase mb-1">Dica de Navegação</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-slate-500">
                                <span>• E: Rotacionar</span>
                                <span>• D: Pan (Mover)</span>
                                <span>• Scroll: Zoom</span>
                                <span>• Dbl-Click: Focar</span>
                            </div>
                        </div>
                    </div>
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
