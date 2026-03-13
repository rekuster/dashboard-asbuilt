/*
 * ESTE ARQUIVO É O NOVO DASHBOARD DE STATUS AS-BUILT.
 * Ele serve para você acompanhar de forma simples se os 108 modelos que contratamos estão sendo entregues.
 * Aqui você vê quantos modelos já foram validados, quantos faltam e se os arquivos originais (.RVT) já foram recebidos.
 * É como uma "sala de situação" para garantir que o projeto final (As-Built) esteja completo para o cliente.
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KPICard from "./KPICard";
import { 
    Box, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    FileCode
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
export default function AsBuiltDashboard() {
    const { data: stats, isLoading } = trpc.dashboard.getAsBuiltStatus.useQuery();
    const { data: deliveryStats } = trpc.dashboard.getEntregasStats.useQuery();

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
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-700">
                <p><strong>Nota Técnica:</strong> Este painel monitora a entrega final dos modelos (As-Built). Diferente do painel de Realidade Aumentada, aqui controlamos se os 108 modelos contratados foram entregues corretamente com os arquivos nativos (.rvt) para manutenção futura.</p>
            </div>

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
