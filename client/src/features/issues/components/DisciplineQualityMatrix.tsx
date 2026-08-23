import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    LabelList,
} from "recharts";
import {
    User,
    ShieldCheck,
    ChevronRight,
    ArrowLeft,
    Building2,
    FileDown,
    Search,
    Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getDisciplineDisplayName } from "../constants";
import { BcfUploadModal } from "@/components/dashboard/BcfUploadModal";

interface DisciplineQualityMatrixProps {
    projectId?: string;
    chartStatsPerResponsavel: any[];
    activeDisciplines: string[];
    selectedDiscipline: string | null;
    onSelectDiscipline: (disc: string | null) => void;
    onSelectRoom: (sala: any) => void;
    groupedValidation: Record<string, Record<string, any[]>>;
    onOpenReportModal: () => void;
}

export function DisciplineQualityMatrix({
    projectId,
    chartStatsPerResponsavel,
    activeDisciplines,
    selectedDiscipline,
    onSelectDiscipline,
    onSelectRoom,
    groupedValidation,
    onOpenReportModal,
}: DisciplineQualityMatrixProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [edificacaoFilter, setEdificacaoFilter] = useState("TODAS");
    const [isBcfModalOpen, setIsBcfModalOpen] = useState(false);

    // VISÃO 1: Disciplina Selecionada -> Tabela Detalhada de Salas ordenada por número
    if (selectedDiscipline) {
        const disc = selectedDiscipline;
        const discLabel = getDisciplineDisplayName(disc);
        const edifs = Object.keys(groupedValidation[disc] || {});

        // Consolida todas as salas da disciplina QUE POSSUEM APONTAMENTOS
        const allRooms: any[] = [];
        let dTotalSalas = 0;
        let dAtivasCount = 0;
        let dRevisaoCount = 0;
        let dResolvedCount = 0;

        edifs.forEach((ed) => {
            (groupedValidation[disc][ed] || []).forEach((s) => {
                const total = s.divergenciasCount || (s.apontamentosCount + s.revisionCount + s.resolvedCount);
                // Apenas salas que possuem apontamentos cadastrados
                if (total > 0) {
                    allRooms.push(s);
                    dTotalSalas++;
                    dAtivasCount += s.apontamentosCount || 0;
                    dRevisaoCount += s.revisionCount || 0;
                    dResolvedCount += s.resolvedCount || 0;
                }
            });
        });

        // Ordenação NUMÉRICA pelo número da sala (ex: 1, 2, 5, 24, 101, 142...)
        allRooms.sort((a, b) => {
            const numA = parseInt(String(a.numeroSala).replace(/\D/g, ""), 10);
            const numB = parseInt(String(b.numeroSala).replace(/\D/g, ""), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return String(a.numeroSala || "").localeCompare(String(b.numeroSala || ""));
        });

        const totalIssuesInDisc = dAtivasCount + dRevisaoCount + dResolvedCount;
        const qualityPct =
            totalIssuesInDisc > 0
                ? ((dResolvedCount / totalIssuesInDisc) * 100).toFixed(1)
                : "100.0";

        // Filtra salas por busca e edificação
        const filteredRooms = allRooms.filter((sala) => {
            const matchesSearch =
                !searchTerm ||
                (sala.nome || sala.salaNome || "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                (sala.numeroSala || "").toLowerCase().includes(searchTerm.toLowerCase());

            const matchesEdif =
                edificacaoFilter === "TODAS" || sala.edificacao === edificacaoFilter;

            return matchesSearch && matchesEdif;
        });

        return (
            <div className="space-y-3.5 animate-in fade-in duration-150 font-sans">
                {/* Header da Disciplina Selecionada */}
                <div className="bg-white p-3.5 px-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectDiscipline(null)}
                            className="h-8 px-2.5 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 text-xs font-bold"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Todas as Disciplinas
                        </Button>

                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-[#9C1915] rounded-xs" />
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                                {discLabel}
                            </h2>
                        </div>
                    </div>

                    {/* Resumo de Indicadores da Disciplina */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                            {dTotalSalas} Salas com Apontamentos
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                            {dResolvedCount} Sanadas ({qualityPct}%)
                        </span>
                        {dAtivasCount > 0 && (
                            <span className="text-[11px] font-bold text-[#9C1915] bg-red-50 border border-red-200 px-2.5 py-1 rounded">
                                {dAtivasCount} Ativas (Aguardando Verificação)
                            </span>
                        )}
                        {dRevisaoCount > 0 && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                                {dRevisaoCount} Em Revisão (Aguardando Correção)
                            </span>
                        )}

                        {projectId && (
                            <Button
                                size="sm"
                                onClick={() => setIsBcfModalOpen(true)}
                                className="h-7 px-3 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-2xs ml-1"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Carregar BCF Navisworks
                            </Button>
                        )}
                    </div>
                </div>

                {/* Barra de Filtros e Busca da Tabela de Salas */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="relative min-w-[220px] max-w-sm flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            placeholder="Buscar sala por nome ou código..."
                            className="pl-8 h-8 text-xs rounded-md border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-8 text-slate-700 focus:outline-none focus:border-[#9C1915] cursor-pointer"
                            value={edificacaoFilter}
                            onChange={(e) => setEdificacaoFilter(e.target.value)}
                        >
                            <option value="TODAS">Todas as Edificações</option>
                            {edifs.map((ed) => (
                                <option key={ed} value={ed}>
                                    {ed}
                                </option>
                            ))}
                        </select>

                        <span className="text-xs font-semibold text-slate-500">
                            {filteredRooms.length} salas encontradas
                        </span>
                    </div>
                </div>

                {/* Tabela de Salas no Padrão Stecla com Ordenação por Número */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#9C1915] text-white font-bold uppercase tracking-wider text-[11px] h-9">
                                    <th className="py-2 px-3.5 w-16">Cód.</th>
                                    <th className="py-2 px-3.5 min-w-[220px]">Sala / Ambiente</th>
                                    <th className="py-2 px-3.5 w-44">Edificação / Pavimento</th>
                                    <th className="py-2 px-3.5 text-center w-24">Total</th>
                                    <th className="py-2 px-3.5 text-center w-24">Ativas</th>
                                    <th className="py-2 px-3.5 text-center w-24">Em Revisão</th>
                                    <th className="py-2 px-3.5 text-center w-24">Sanadas</th>
                                    <th className="py-2 px-3.5 text-center w-32">Status da Sala</th>
                                    <th className="py-2 px-3.5 text-right w-28">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRooms.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-10 text-slate-400 italic">
                                            Nenhuma sala com apontamentos encontrada com os filtros selecionados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRooms.map((salaItem) => {
                                        const ativas = salaItem.apontamentosCount || 0;
                                        const revisao = salaItem.revisionCount || 0;
                                        const sanadas = salaItem.resolvedCount || 0;
                                        const total = salaItem.divergenciasCount || (ativas + revisao + sanadas);

                                        let statusBadge = {
                                            label: "CONFORME",
                                            cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                        };

                                        if (ativas > 0) {
                                            statusBadge = {
                                                label: "ATIVA",
                                                cls: "bg-red-50 text-[#9C1915] border-red-200",
                                            };
                                        } else if (revisao > 0) {
                                            statusBadge = {
                                                label: "EM REVISÃO",
                                                cls: "bg-amber-50 text-amber-700 border-amber-200",
                                            };
                                        }

                                        return (
                                            <tr
                                                key={salaItem.salaId || salaItem.id}
                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                                onClick={() => onSelectRoom(salaItem)}
                                            >
                                                <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 font-semibold">
                                                    {salaItem.numeroSala || "—"}
                                                </td>
                                                <td className="py-2.5 px-3.5 font-bold text-slate-900 group-hover:text-[#9C1915] transition-colors">
                                                    {salaItem.salaNome || salaItem.nome}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-[11px] text-[#575756]">
                                                    {salaItem.edificacao} • {salaItem.pavimento || "—"}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                                    {total}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-center font-bold">
                                                    {ativas > 0 ? (
                                                        <span className="text-[#9C1915] bg-red-50 px-2 py-0.5 rounded">
                                                            {ativas}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-center font-bold">
                                                    {revisao > 0 ? (
                                                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                            {revisao}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-center font-bold">
                                                    {sanadas > 0 ? (
                                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                            {sanadas}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-center">
                                                    <span
                                                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${statusBadge.cls}`}
                                                    >
                                                        {statusBadge.label}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-3 text-[11px] font-bold rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white shadow-xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectRoom(salaItem);
                                                        }}
                                                    >
                                                        Verificação
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {projectId && (
                    <BcfUploadModal
                        isOpen={isBcfModalOpen}
                        onClose={() => setIsBcfModalOpen(false)}
                        projectId={projectId}
                        initialDiscipline={selectedDiscipline || undefined}
                        initialEdificacao={edificacaoFilter !== "TODAS" ? edificacaoFilter : undefined}
                        disciplinesList={activeDisciplines.map((d) => ({
                            sigla: d,
                            nome: getDisciplineDisplayName(d),
                        }))}
                        edificacoesList={edifs.length > 0 ? edifs : ["Prédio Produção"]}
                    />
                )}
            </div>
        );
    }

    // VISÃO 2: Grid de Cards de Todas as Disciplinas com Gráficos por Responsável no Topo
    return (
        <div className="space-y-4 animate-in fade-in duration-150 font-sans">
            {/* Gráficos de Distribuição por Responsável (Ocle, Thá, Stecla, etc.) */}
            {chartStatsPerResponsavel.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <User className="w-4 h-4 text-[#9C1915]" />
                        <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                            Desempenho por Empresa / Responsável
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                        {chartStatsPerResponsavel.map((respStat, idx) => (
                            <Card
                                key={idx}
                                className="border border-slate-200 bg-white rounded-xl shadow-xs p-3.5 overflow-hidden"
                            >
                                <CardHeader className="p-0 mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-[#9C1915]" />
                                            <CardTitle className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                                {respStat.responsavel}
                                            </CardTitle>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                            {respStat.totalQuality}% Sanados
                                        </span>
                                    </div>
                                </CardHeader>
                                <div
                                    style={{
                                        height: `${Math.max(100, respStat.data.length * 32 + 15)}px`,
                                    }}
                                    className="w-full"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={respStat.data}
                                            layout="vertical"
                                            margin={{ left: 0, right: 45, top: 0, bottom: 0 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={65}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    fill: "#575756",
                                                }}
                                                interval={0}
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: "#F8FAFC" }}
                                                contentStyle={{
                                                    borderRadius: "8px",
                                                    borderColor: "#E2E8F0",
                                                    fontSize: "11px",
                                                }}
                                            />
                                            <Bar
                                                dataKey="resolvida"
                                                stackId="a"
                                                name="Sanadas"
                                                fill="#10b981"
                                                barSize={16}
                                            >
                                                <LabelList
                                                    dataKey="resolvida"
                                                    position="center"
                                                    style={{
                                                        fontSize: "9px",
                                                        fontWeight: "bold",
                                                        fill: "white",
                                                    }}
                                                    formatter={(val: any) => (val > 0 ? val : "")}
                                                />
                                            </Bar>
                                            <Bar
                                                dataKey="revisao"
                                                stackId="a"
                                                name="Em Revisão"
                                                fill="#f59e0b"
                                                barSize={16}
                                            >
                                                <LabelList
                                                    dataKey="revisao"
                                                    position="center"
                                                    style={{
                                                        fontSize: "9px",
                                                        fontWeight: "bold",
                                                        fill: "white",
                                                    }}
                                                    formatter={(val: any) => (val > 0 ? val : "")}
                                                />
                                            </Bar>
                                            <Bar
                                                dataKey="ativa"
                                                stackId="a"
                                                name="Ativas"
                                                fill="#9C1915"
                                                radius={[0, 3, 3, 0]}
                                                barSize={16}
                                            >
                                                <LabelList
                                                    dataKey="ativa"
                                                    position="center"
                                                    style={{
                                                        fontSize: "9px",
                                                        fontWeight: "bold",
                                                        fill: "white",
                                                    }}
                                                    formatter={(val: any) => (val > 0 ? val : "")}
                                                />
                                                <LabelList
                                                    dataKey="qualidade"
                                                    position="right"
                                                    style={{
                                                        fontSize: "10px",
                                                        fontWeight: "bold",
                                                        fill: "#575756",
                                                    }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* SEÇÃO PRINCIPAL: GRID DE CARDS DE DISCIPLINAS */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#9C1915]" />
                        <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                            Disciplinas com Apontamentos de Campo ({activeDisciplines.length})
                        </h3>
                    </div>
                    <Button
                        onClick={onOpenReportModal}
                        variant="outline"
                        className="h-7.5 px-3 text-xs font-bold rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
                    >
                        <FileDown className="w-3.5 h-3.5 text-[#9C1915]" />
                        Gerar Relatório de Verificação
                    </Button>
                </div>

                {/* Grid de Cards de Disciplina */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeDisciplines.map((disc) => {
                        const edifs = Object.keys(groupedValidation[disc] || {});
                        let dTotalSalas = 0;
                        let dAtivas = 0;
                        let dRevisao = 0;
                        let dResolvidas = 0;

                        edifs.forEach((ed) => {
                            (groupedValidation[disc][ed] || []).forEach((s) => {
                                const total = s.divergenciasCount || (s.apontamentosCount + s.revisionCount + s.resolvedCount);
                                if (total > 0) {
                                    dTotalSalas++;
                                    dAtivas += s.apontamentosCount || 0;
                                    dRevisao += s.revisionCount || 0;
                                    dResolvidas += s.resolvedCount || 0;
                                }
                            });
                        });

                        const totalIssues = dAtivas + dRevisao + dResolvidas;
                        const qualityRate =
                            totalIssues > 0
                                ? ((dResolvidas / totalIssues) * 100).toFixed(1)
                                : "100.0";
                        const isAllOk = dAtivas === 0 && dRevisao === 0 && totalIssues > 0;
                        const discLabel = getDisciplineDisplayName(disc);

                        return (
                            <Card
                                key={disc}
                                className="group cursor-pointer border border-slate-200 bg-white rounded-xl shadow-xs hover:border-[#9C1915] hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                                onClick={() => onSelectDiscipline(disc)}
                            >
                                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-red-50 text-slate-700 group-hover:text-[#9C1915] flex items-center justify-center font-bold text-xs transition-colors">
                                            {disc.slice(0, 3).toUpperCase()}
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-bold uppercase tracking-wide text-slate-900 group-hover:text-[#9C1915] transition-colors">
                                                {discLabel}
                                            </CardTitle>
                                            <span className="text-[10px] text-[#575756]">
                                                {dTotalSalas} salas • {totalIssues} apontamentos
                                            </span>
                                        </div>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#9C1915] transition-colors" />
                                </CardHeader>

                                <CardContent className="p-4 pt-3 space-y-3">
                                    {/* Indicadores numéricos */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                            <span className="text-[9px] font-bold uppercase text-[#575756] block">
                                                Ativas
                                            </span>
                                            <span className="text-xs font-bold text-[#9C1915]">
                                                {dAtivas}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                            <span className="text-[9px] font-bold uppercase text-[#575756] block">
                                                Em Revisão
                                            </span>
                                            <span className="text-xs font-bold text-amber-700">
                                                {dRevisao}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                            <span className="text-[9px] font-bold uppercase text-[#575756] block">
                                                Sanadas
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700">
                                                {dResolvidas}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Barra de Progresso e Qualidade */}
                                    <div className="space-y-1 pt-1 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-semibold text-[#575756]">
                                                Taxa de Resolução
                                            </span>
                                            <span
                                                className={`font-bold ${
                                                    isAllOk
                                                        ? "text-emerald-700"
                                                        : "text-slate-800"
                                                }`}
                                            >
                                                {qualityRate}%
                                            </span>
                                        </div>

                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    isAllOk
                                                        ? "bg-emerald-500"
                                                        : "bg-[#9C1915]"
                                                }`}
                                                style={{ width: `${qualityRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
