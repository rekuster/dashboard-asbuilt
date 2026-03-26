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
    Box, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    FileCode,
    ArrowRightLeft
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

/**
 * Dashboard específico para Status das Entregas As-Built.
 * Foca no controle da Lista Mestra (108 modelos) e rastreio de arquivos RVT.
 */
export default function AsBuiltDashboard({ selectedEdificacao }: { selectedEdificacao: string | null }) {
    const { data: stats, isLoading } = trpc.dashboard.getAsBuiltStatus.useQuery({ 
        edificacao: selectedEdificacao || undefined 
    });
    const { data: deliveryStats } = trpc.dashboard.getEntregasStats.useQuery({
        edificacao: selectedEdificacao || undefined
    });

    if (isLoading || !stats) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando indicadores as-built...</div>;
    }

    const rvtData = [
        { name: "Possui RVT Original", value: stats.comRvt, color: "#22c55e" },
        { name: "Pendente de RVT", value: stats.semRvt, color: "#f59e0b" },
    ];

    const modelStatusData = [
        { name: "Modelos Validados", value: stats.modelosValidados, color: "#10b981" },
        { name: "Em Recebimento", value: stats.modelosRecebidos - stats.modelosValidados, color: "#3b82f6" },
        { name: "Pendentes", value: stats.modelosPendentes, color: "#94a3b8" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Explicação Leiga para o Usuário */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <p><strong>Nota Técnica:</strong> Este painel monitora a entrega final dos modelos (As-Built). Diferente do painel de Realidade Aumentada, aqui controlamos se os modelos contratados foram entregues corretamente com os arquivos nativos (.rvt) para manutenção futura.</p>
                {selectedEdificacao && (
                    <Badge className="bg-blue-600 text-white border-none shrink-0 self-start md:self-auto">
                        Filtrado: {selectedEdificacao}
                    </Badge>
                )}
            </div>

            {/* Consolidation Summary Card (Projeto vs As-Built) */}
            <Card className="border-none shadow-lg bg-gradient-to-r from-slate-800 to-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ArrowRightLeft className="w-32 h-32" />
                </div>
                <CardContent className="p-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                        <div className="text-center group">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Modelos de Projeto</p>
                            <h3 className="text-4xl font-black">{stats.projectModels}</h3>
                            <p className="text-[10px] text-slate-500 mt-1">Identificados originalmente</p>
                        </div>
                        
                        <div className="flex items-center justify-center p-3 bg-white/10 rounded-full">
                            <ArrowRightLeft className="w-6 h-6 text-blue-400 animate-pulse" />
                        </div>

                        <div className="text-center group">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-emerald-400 transition-colors">Modelos As-Built</p>
                            <h3 className="text-4xl font-black text-emerald-400">{stats.asBuiltModels}</h3>
                            <p className="text-[10px] text-slate-500 mt-1">Alvos de entrega final</p>
                        </div>

                        <div className="h-12 w-px bg-white/10 hidden md:block" />

                        <div className="text-center">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Fator de Consolidação</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-2xl font-bold">-{stats.consolidationFactor}</span>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">Otimizado</Badge>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">Redução de arquivos para entrega</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Cobertura As-Built"
                    value={`${stats.percentualCobertura.toFixed(1)}%`}
                    subtitle={`${stats.modelosValidados} de ${stats.totalModelos} modelos`}
                    icon={CheckCircle}
                    variant="green"
                />
                <KPICard
                    title="Modelos Recebidos"
                    value={stats.modelosRecebidos}
                    subtitle="Aguardando validação técnica"
                    icon={Box}
                    variant="blue"
                />
                <KPICard
                    title="Pendência de RVT"
                    value={stats.semRvt}
                    subtitle="Modelos sem arquivo nativo"
                    icon={FileCode}
                    variant="orange"
                />
                <KPICard
                    title="Atrasos Previstos"
                    value={deliveryStats?.atrasados || 0}
                    subtitle="Entregas fora do prazo"
                    icon={Clock}
                    variant="red"
                />
            </div>

            {/* Reconciliation Section (Thá vs Stecla) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-amber-200 bg-amber-50/20">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                            Divergências de Controle
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm text-muted-foreground">Thá reporta:</p>
                                    <p className="text-2xl font-bold text-amber-600">{stats.thaPostados} Modelos</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Não Validados:</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.thaDivergentes}</p>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-amber-100">
                                <p className="text-[10px] uppercase font-bold text-amber-700 mb-2">Resumo da Reconciliação</p>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Existem <strong>{stats.thaDivergentes}</strong> modelos que a Thá informa ter "POSTADO" no controle R07, mas que ainda não possuem uma entrega validada em nosso sistema.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">Lista de Divergências (Thá x Stecla)</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-normal">Sincronizado com R07</Badge>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto">
                        <div className="space-y-2">
                            {stats.divergenciasTha && stats.divergenciasTha.length > 0 ? (
                                stats.divergenciasTha.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                                        <div className="min-w-0 flex-1 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-700">{item.edificacao}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-medium uppercase">{item.disciplina}</span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-900 truncate">{item.nomeModeloFinal || item.nomeModelo}</p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px]">
                                                Planilha Thá: {item.statusTha}
                                            </Badge>
                                            <span className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tight">Pendente Validação</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-20" />
                                    <p className="text-sm">Nenhuma divergência encontrada</p>
                                    <p className="text-[10px]">Todos os envios da Thá foram validados ou não há envios pendentes.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status dos Modelos (Lista Mestra) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Progresso da Lista Mestra</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={modelStatusData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {modelStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Saúde Técnica (RVT Original) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Saúde Técnica (Arquivos .RVT)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={rvtData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {rvtData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
            {/* Alerta Específico sobre a Qualidade (Ajuda Thá/Ocle) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            Atenção: Qualidade das Entregas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Modelos recebidos apenas em IFC sem o arquivo RVT dificultam a manutenção futura. 
                            Verifique na aba "Entregas" os modelos marcados como pendentes de nativo.
                        </p>
                    </CardContent>
                </Card>
                
                <Card className="border-l-4 border-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Próximos Passos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Ao validar uma entrega na aba ao lado, o sistema vinculará automaticamente as 
                            divergências de campo resolvidas, atualizando este gráfico em tempo real.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
