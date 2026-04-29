/*
 * ESTE ARQUIVO É O NOVO DASHBOARD DE STATUS AS-BUILT.
 * Ele serve para você acompanhar de forma simples se os 108 modelos que contratamos estão sendo entregues.
 * Aqui você vê quantos modelos já foram validados, quantos faltam e se os arquivos originais (.RVT) já foram recebidos.
 * É como uma "sala de situação" para garantir que o projeto final (As-Built) esteja completo para o cliente.
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KPICard from "./KPICard";
import { 
    Building2,
    Box, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    FileCode,
    ArrowRightLeft,
    Layers,
    Briefcase,
    TrendingUp,
    FileCheck,
    Info,
    Calendar,
    Settings2,
    BarChart3
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area,
    LabelList
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip as ShadcnTooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Foca no controle da Lista Mestra (108 modelos) e rastreio de arquivos.
 */
export default function AsBuiltDashboard({ selectedEdificacao }: { selectedEdificacao: string | null }) {
    const { data: stats, isLoading } = trpc.dashboard.getAsBuiltStatus.useQuery({ 
        edificacao: selectedEdificacao || undefined 
    });

    if (isLoading || !stats) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando indicadores as-built...</div>;
    }

    const rvtData = [
        { name: "Possui RVT Original", value: stats.comRvt, color: "#940707" },
        { name: "Pendente de RVT", value: stats.semRvt, color: "#f59e0b" },
    ];

    const modelStatusData = [
        { name: "Modelos Validados", value: stats.modelosValidados, color: "#940707" },
        { name: "Em Recebimento", value: stats.modelosRecebidos, color: "#475569" },
        { name: "Pendentes", value: stats.modelosPendentes, color: "#94a3b8" },
    ];

    const renderCustomizedLabel = ({ percent }: { percent: number }) => {
        return `${(percent * 100).toFixed(1)}%`;
    };

    const renderTooltip = (value: number, name: string, data: any[]) => {
        const total = data.reduce((acc, curr) => acc + (curr.value || curr.count || 0), 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return [`${value} (${percentage}%)`, name];
    };

    return (
        <TooltipProvider>
            <div className="bg-white p-8 rounded-none shadow-none min-h-[900px] flex flex-col gap-8 border border-slate-100 overflow-hidden" id="asbuilt-presentation-slide">
            {/* Header / Branding (Matching PresentationTab) */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Status das Entregas As-Built
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-slate-500 font-medium">
                        <Building2 className="w-4 h-4 text-[#940707]" />
                        <span className="text-sm uppercase tracking-widest font-bold">
                            {selectedEdificacao ? `EDIFICAÇÃO: ${selectedEdificacao}` : 'GERAL - TODAS AS EDIFICAÇÕES'}
                        </span>
                    </div>
                </div>
                <img
                    src="/logos_stecla/versao_horizontal@4x.png"
                    alt="Stecla Engenharia"
                    className="h-10 object-contain"
                />
            </div>

            {/* Top Row: Main KPIs (Matching PresentationTab Cards Style) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-50 border-none shadow-sm rounded-xl p-4 border-l-4 border-slate-300">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arquivos Totais</p>
                            <ShadcnTooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-slate-300" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px]">
                                    <p>Contagem total de todos os arquivos e revisões recebidos no sistema.</p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{stats.totalArquivos}</span>
                            <span className="text-slate-400 font-medium text-xs">Entregas</span>
                        </div>
                    </Card>

                    <Card className="bg-emerald-50/50 border-none shadow-sm rounded-xl p-4 border-l-4 border-emerald-500">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-black">Cobertura de Modelos</p>
                            <ShadcnTooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-emerald-300" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px]">
                                    <p>Percentual de modelos da Lista Mestra (dos 108 contratados) que já tiveram o processo de entrega iniciado.</p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{stats.modelosComEntrega}</span>
                            <span className="text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                                {stats.percentualEntregasIniciadas.toFixed(1)}%
                            </span>
                        </div>
                    </Card>

                    <Card className="bg-rose-50/50 border-none shadow-sm rounded-xl p-4 border-l-4 border-rose-500">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest font-black">Pendência de RVT</p>
                            <ShadcnTooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-rose-300" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px]">
                                    <p>Modelos que ainda não enviaram o arquivo nativo (.RVT) editável, essencial para o As-Built.</p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{stats.semRvt}</span>
                            <span className="text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded text-[10px]">
                                {((stats.semRvt / (stats.totalModelos || 1)) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </Card>

                    <Card className="bg-[#f0f9f1] border-none shadow-sm rounded-xl p-4 border-l-4 border-[#166534]">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-[#166534] uppercase tracking-widest font-black">Eficiência</p>
                            <ShadcnTooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-[#166534]/30" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px]">
                                    <p>Taxa de aprovação técnica na primeira análise (sem necessidade de ressubmissão por correções).</p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{stats.taxaAprovacao.toFixed(1)}%</span>
                            <span className="text-[#166534] font-medium text-[11px] ml-2">1ª Passagem</span>
                        </div>
                    </Card>
                </div>

            <div className="grid grid-cols-12 gap-8 flex-1">
                {/* Saúde por Disciplina (Left Column - 8/12) */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    <Card className="border-none shadow-sm bg-white border border-slate-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-[#940707]" />
                                Saúde Técnica por Disciplina
                            </h2>
                            <ShadcnTooltip>
                                <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-slate-300" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                    <p>Status de aprovação técnica de cada disciplina, separando o que já foi validado, o que está em análise e o que ainda está pendente.</p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        </div>
                        <div className="h-[600px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.statsPorDisciplina} layout="vertical" margin={{ left: 30, right: 30, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={180} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        interval={0}
                                        tick={{ fontSize: 9, fontWeight: 'bold', fill: '#475569' }} 
                                    />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                    <Bar dataKey="validado" name="Validados" stackId="a" fill="#940707" radius={[0, 0, 0, 0]} barSize={28}>
                                        <LabelList 
                                            dataKey="validado" 
                                            position="insideLeft" 
                                            fill="#fff" 
                                            fontSize={10} 
                                            fontWeight="bold"
                                            offset={10}
                                        />
                                    </Bar>
                                    <Bar dataKey="recebido" name="Em Análise" stackId="a" fill="#475569" barSize={28}>
                                        <LabelList 
                                            dataKey="recebido" 
                                            position="insideLeft" 
                                            fill="#fff" 
                                            fontSize={10} 
                                            fontWeight="bold"
                                            offset={10}
                                        />
                                    </Bar>
                                    <Bar dataKey="pendente" name="Pendentes" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={28}>
                                        <LabelList 
                                            dataKey="pendente" 
                                            position="insideLeft" 
                                            fill="#64748b" 
                                            fontSize={10} 
                                            fontWeight="bold"
                                            offset={10}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Timeline de Recebimento */}
                    <Card className="border-none shadow-sm bg-white border border-slate-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-[#940707]" />
                                Arquivos Recebidos (Frequência Quinzenal)
                            </h2>
                            <ShadcnTooltip>
                                <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-slate-300" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                    <p>Acompanhamento do volume de arquivos recebidos ao longo do tempo, agrupados por períodos de 15 dias.</p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        </div>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.timelineRecebimento} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#940707" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#940707" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="count" name="Arquivos" stroke="#940707" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)">
                                        <LabelList dataKey="count" position="top" offset={10} fontSize={10} fontWeight="bold" fill="#940707" />
                                    </Area>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Right Column (4/12) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Ranking de Fornecedores */}
                    <Card className="border-none shadow-sm bg-white border border-slate-100 rounded-2xl p-6">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-[#940707]" />
                            Progresso Fornecedores
                        </h2>
                        <div className="space-y-6">
                            {(stats.statsPorEmpresa || []).map((emp: any) => (
                                <div key={emp.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                                        <span className="text-slate-700 truncate max-w-[150px]">{emp.name}</span>
                                        <span className="text-[#940707]">{emp.percent.toFixed(1)}%</span>
                                    </div>
                                    <div className="relative">
                                        <Progress value={emp.percent} className="h-2 rounded-full bg-slate-100" />
                                        <style dangerouslySetInnerHTML={{ __html: `
                                            [role="progressbar"] > div { background-color: #940707 !important; }
                                        `}} />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                        <span>{emp.concluido} validados</span>
                                        <span>Meta: {emp.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Saúde Técnica Pie */}
                    <Card className="border-none shadow-sm bg-white border border-slate-100 rounded-2xl p-6 flex-1">
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileCode className="w-3.5 h-3.5 text-[#940707]" />
                            Arquivos Nativos (.RVT)
                        </h2>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={rvtData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                        label={renderCustomizedLabel}
                                    >
                                        {rvtData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number, name: string) => renderTooltip(val, name, rvtData)} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        align="center"
                                        formatter={(value: string) => {
                                            const item = rvtData.find(d => d.name === value);
                                            const total = rvtData.reduce((acc, curr) => acc + curr.value, 0);
                                            const percentage = total > 0 && item ? ((item.value / total) * 100).toFixed(1) : 0;
                                            return <span className="text-[10px] font-bold uppercase">{value} ({percentage}%)</span>;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
            
            {/* Guia de Conferência Técnica (Bottom Slide Section) */}
            <div className="pt-6 border-t-2 border-slate-100">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Settings2 className="w-4 h-4 text-[#940707]" />
                    Guia de Conferência Técnica (Apoio ao Recebimento)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border-l-4 border-emerald-500 bg-emerald-50/20 p-4 rounded-r-xl">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <FileCheck className="w-3.5 h-3.5" />
                            1. Requisitos de Arquivo
                        </p>
                        <ul className="text-[11px] font-bold text-slate-700 space-y-1 ml-1">
                            <li>• Nomenclatura conforme BEP</li>
                            <li>• Check de Versão do Revit</li>
                            <li>• Arquivo RVT Nativo (Editável)</li>
                        </ul>
                    </div>

                    <div className="border-l-4 border-blue-500 bg-blue-50/20 p-4 rounded-r-xl">
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Box className="w-3.5 h-3.5" />
                            2. Geometria e Dados
                        </p>
                        <ul className="text-[11px] font-bold text-slate-700 space-y-1 ml-1">
                            <li>• Georreferenciamento Preciso</li>
                            <li>• Parâmetros As-Built preenchidos</li>
                            <li>• Nível de Detalhe (LOD 500)</li>
                        </ul>
                    </div>
                    
                    <div className="border-l-4 border-purple-500 bg-purple-50/20 p-4 rounded-r-xl">
                        <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5" />
                            3. Fechamento de Ciclo
                        </p>
                        <ul className="text-[11px] font-bold text-slate-700 space-y-1 ml-1">
                            <li>• Documentação DWG/PDF OK</li>
                            <li>• Divergências de campo sanadas</li>
                            <li>• Registro na Lista Mestra OK</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </TooltipProvider>
);
}
