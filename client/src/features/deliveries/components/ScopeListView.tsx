import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Layers,
    Plus,
    Edit2,
    Trash2,
    Search,
    History,
    ArrowLeft,
    ChevronRight,
    Building2,
    CalendarCheck2,
    CheckSquare,
    Square,
    FileText,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TimelineParciais } from "./TimelineParciais";
import { ScopeFormModal } from "./ScopeFormModal";
import { ModelValidationModal } from "./ModelValidationModal";
import { QuinzenaBatchModal } from "./QuinzenaBatchModal";
import { PacketsListView } from "./PacketsListView";
import { DocumentsListView } from "./DocumentsListView";
import {
    isSameDiscipline,
    normalizeEdificacao,
} from "@/features/issues/constants";

interface ScopeListViewProps {
    projectId: string;
    entregas: any[];
    selectedEdificacao?: string;
    onViewEntrega: (e: any) => void;
    onNewDelivery?: (empresa?: string) => void;
    onDeleteEntrega?: (id: number, e?: React.MouseEvent) => void;
    onEditEntrega?: (e: any) => void;
    onStatusChangeEntrega?: (entrega: any, newStatus: string) => void;
}

export function ScopeListView({
    projectId,
    entregas,
    selectedEdificacao,
    onViewEntrega,
    onNewDelivery,
    onDeleteEntrega,
    onEditEntrega,
    onStatusChangeEntrega,
}: ScopeListViewProps) {
    // Nível 1 (null) = Visão de Cards por Empresa | Nível 2 = Empresa Selecionada ("Ocle", "Thá", "AeB")
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [companySubView, setCompanySubView] = useState<"models" | "packets" | "logs">("models");

    const [selectedEscopoTimeline, setSelectedEscopoTimeline] = useState<any>(null);
    const [validatingEscopo, setValidatingEscopo] = useState<any>(null);
    const [isEscopoFormOpen, setIsEscopoFormOpen] = useState(false);
    const [editingEscopo, setEditingEscopo] = useState<any>(null);
    const [isQuinzenaModalOpen, setIsQuinzenaModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterEdificacao, setFilterEdificacao] = useState("TODAS");
    const [filterStatus, setFilterStatus] = useState("TODOS");

    const { data: escopos = [], isLoading: loadingEscopos } =
        trpc.dashboard.getEscopos.useQuery({ projectId });
    const { data: apontamentos = [] } =
        trpc.dashboard.getApontamentos.useQuery({ projectId });
    const utils = trpc.useUtils();

    const invalidateAll = () => {
        utils.dashboard.getEscopos.invalidate({ projectId });
        utils.dashboard.getEntregas.invalidate({ projectId });
        utils.dashboard.getEntregasStats.invalidate({ projectId });
        utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
        utils.analytics.getAsBuiltModelsSummary.invalidate({ projectId });
    };

    const deleteMutation = trpc.dashboard.deleteEscopo.useMutation({
        onSuccess: invalidateAll,
    });

    const syncCloudMutation = trpc.dashboard.sincronizarSteclaCloud.useMutation({
        onSuccess: (res) => {
            invalidateAll();
            const newCount = (res?.addedAebDeliveries || 0) + (res?.addedAebModels || 0);
            if (newCount > 0) {
                toast.success(
                    `Leitura concluída! ${res.addedAebDeliveries} novas entregas detectadas no SteclaCloud.`
                );
            } else {
                toast.info(
                    "Leitura concluída no SteclaCloud. Nenhuma nova entrega quinzenal encontrada."
                );
            }
        },
        onError: (err) => {
            toast.error("Erro ao consultar SteclaCloud: " + err.message);
        },
    });

    // Normaliza nome de empresa para agrupamento consistente (Ocle, Thá, AeB)
    const normalizeCompany = (raw?: string) => {
        const val = (raw || "").trim();
        if (!val) return "Outras";
        const lower = val.toLowerCase();
        if (lower.includes("ocle")) return "Ocle";
        if (lower.includes("thá") || lower.includes("tha")) return "Thá";
        if (lower.includes("aeb") || lower.includes("a&b")) return "AeB";
        return val;
    };

    // Consolida estatísticas por Empresa para o Nível 1
    const companyCardsData = useMemo(() => {
        const baseCompanies = ["Ocle", "Thá", "AeB"];
        const allFound = new Set<string>(baseCompanies);
        escopos.forEach((e: any) => {
            if (e.empresa) allFound.add(normalizeCompany(e.empresa));
        });

        return Array.from(allFound)
            .map((company) => {
                const compEscopos = escopos.filter((e: any) => {
                    const matchesComp = normalizeCompany(e.empresa) === company;
                    const matchesGlobalEdif =
                        !selectedEdificacao ||
                        e.edificacao?.toLowerCase().includes(selectedEdificacao.toLowerCase());
                    return matchesComp && matchesGlobalEdif;
                });

                const compEntregas = entregas.filter((ent: any) => {
                    const matchesComp = normalizeCompany(ent.empresaResponsavel) === company;
                    const matchesGlobalEdif =
                        !selectedEdificacao ||
                        ent.edificacao?.toLowerCase().includes(selectedEdificacao.toLowerCase());
                    return matchesComp && matchesGlobalEdif;
                });

                const total = compEscopos.length;
                const validados = compEscopos.filter(
                    (e: any) => e.statusAuditoria === "VALIDADO"
                ).length;
                const comPendencias = compEscopos.filter(
                    (e: any) => e.statusAuditoria === "COM_PENDENCIAS"
                ).length;
                const igualProjeto = compEscopos.filter(
                    (e: any) => e.statusAuditoria === "IGUAL_PROJETO"
                ).length;
                const naoEntregues = compEscopos.filter(
                    (e: any) => !e.statusAuditoria || e.statusAuditoria === "NAO_ENTREGUE"
                ).length;

                const totalPranchas = compEscopos.reduce(
                    (acc: number, e: any) => acc + (e.totalPranchas || 0),
                    0
                );
                const pranchasValidadas = compEscopos.reduce(
                    (acc: number, e: any) => acc + (e.pranchasValidadas || 0),
                    0
                );

                const edifsSet = new Set(
                    compEscopos.map((e: any) => e.edificacao).filter(Boolean)
                );
                const pacotesSet = new Set(
                    compEntregas.map((ent: any) => ent.identificadorEntrega).filter(Boolean)
                );

                // Dados por edificação para mini-gráfico (mesmo estilo do DisciplineQualityMatrix)
                const edifMap: Record<
                    string,
                    {
                        name: string;
                        validado: number;
                        pendente: number;
                        igualProjeto: number;
                        naoEntregue: number;
                        total: number;
                    }
                > = {};

                compEscopos.forEach((e: any) => {
                    const ed = e.edificacao || "Geral";
                    if (!edifMap[ed]) {
                        edifMap[ed] = {
                            name: ed,
                            validado: 0,
                            pendente: 0,
                            igualProjeto: 0,
                            naoEntregue: 0,
                            total: 0,
                        };
                    }
                    edifMap[ed].total++;
                    if (e.statusAuditoria === "VALIDADO") edifMap[ed].validado++;
                    else if (e.statusAuditoria === "COM_PENDENCIAS") edifMap[ed].pendente++;
                    else if (e.statusAuditoria === "IGUAL_PROJETO") edifMap[ed].igualProjeto++;
                    else edifMap[ed].naoEntregue++;
                });

                const chartData = Object.values(edifMap).map((d) => ({
                    ...d,
                    resumo: `${d.validado}/${d.total}`,
                }));

                const approvalRate =
                    total > 0 ? ((validados / total) * 100).toFixed(1) : "0.0";
                const deliveredRate =
                    total > 0
                        ? (((validados + comPendencias + igualProjeto) / total) * 100).toFixed(0)
                        : "0";

                return {
                    company,
                    sigla:
                        company === "Ocle"
                            ? "OCL"
                            : company === "Thá"
                            ? "THÁ"
                            : company === "AeB"
                            ? "AEB"
                            : company.slice(0, 3).toUpperCase(),
                    subtitle:
                        company === "Ocle"
                            ? "Instalações & ETE"
                            : company === "Thá"
                            ? "Civil, Arquitetura & Estruturas"
                            : company === "AeB"
                            ? "Sede Recreativa & Especiais"
                            : "Contratada",
                    total,
                    validados,
                    comPendencias,
                    igualProjeto,
                    naoEntregues,
                    totalPranchas,
                    pranchasValidadas,
                    totalEdificacoes: edifsSet.size,
                    totalPacotes: pacotesSet.size,
                    totalArquivosEntregues: compEntregas.length,
                    approvalRate,
                    deliveredRate,
                    chartData,
                };
            })
            .filter((c) => c.total > 0 || ["Ocle", "Thá", "AeB"].includes(c.company));
    }, [escopos, entregas, selectedEdificacao]);

    // Edificações únicas da empresa selecionada
    const companyEdificacoes = useMemo(() => {
        if (!selectedCompany) return [];
        const set = new Set<string>();
        escopos
            .filter((e: any) => normalizeCompany(e.empresa) === selectedCompany)
            .forEach((e: any) => {
                if (e.edificacao) set.add(e.edificacao);
            });
        return Array.from(set).sort();
    }, [escopos, selectedCompany]);

    // Modelos filtrados da empresa selecionada (Nível 2)
    const filteredCompanyEscopos = useMemo(() => {
        if (!selectedCompany) return [];
        const q = searchTerm.trim().toLowerCase();

        return escopos.filter((e: any) => {
            const matchesComp = normalizeCompany(e.empresa) === selectedCompany;
            if (!matchesComp) return false;

            const matchesGlobalEdif =
                !selectedEdificacao ||
                e.edificacao?.toLowerCase().includes(selectedEdificacao.toLowerCase());
            const matchesEdif =
                filterEdificacao === "TODAS" || e.edificacao === filterEdificacao;
            const statusKey = e.statusAuditoria || "NAO_ENTREGUE";
            const matchesStatus =
                filterStatus === "TODOS" || statusKey === filterStatus;

            const matchesSearch =
                !q ||
                (e.disciplina || "").toLowerCase().includes(q) ||
                (e.edificacao || "").toLowerCase().includes(q) ||
                (e.nomeModelo || "").toLowerCase().includes(q) ||
                (e.nomeModeloFinal || "").toLowerCase().includes(q) ||
                (e.parecerTecnico || "").toLowerCase().includes(q);

            return (
                matchesGlobalEdif &&
                matchesEdif &&
                matchesStatus &&
                matchesSearch
            );
        });
    }, [
        escopos,
        selectedCompany,
        selectedEdificacao,
        filterEdificacao,
        filterStatus,
        searchTerm,
    ]);

    // Entregas filtradas da empresa selecionada (para sub-visão de Pacotes SMs)
    const filteredCompanyEntregas = useMemo(() => {
        if (!selectedCompany) return [];
        const q = searchTerm.trim().toLowerCase();
        return entregas.filter((ent: any) => {
            const matchesComp = normalizeCompany(ent.empresaResponsavel) === selectedCompany;
            if (!matchesComp) return false;
            const matchesEdif =
                filterEdificacao === "TODAS" || ent.edificacao === filterEdificacao;
            const matchesSearch =
                !q ||
                (ent.identificadorEntrega || "").toLowerCase().includes(q) ||
                (ent.nomeDocumento || "").toLowerCase().includes(q) ||
                (ent.disciplina || "").toLowerCase().includes(q);
            return matchesEdif && matchesSearch;
        });
    }, [entregas, selectedCompany, filterEdificacao, searchTerm]);

    const selectedEscopoObjects = useMemo(
        () => escopos.filter((e: any) => selectedIds.includes(e.id)),
        [escopos, selectedIds]
    );

    const toggleSelectAll = () => {
        const visibleIds = filteredCompanyEscopos.map((e: any) => e.id);
        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id: number) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const toggleSelectRow = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    if (selectedEscopoTimeline) {
        return (
            <TimelineParciais
                escopo={selectedEscopoTimeline}
                onBack={() => setSelectedEscopoTimeline(null)}
                onViewEntrega={onViewEntrega}
            />
        );
    }

    // =========================================================================
    // NÍVEL 1: VISÃO GERAL POR EMPRESA (OCLE, THÁ, AEB) - PADRÃO STECLA
    // =========================================================================
    if (!selectedCompany) {
        return (
            <div className="space-y-4 animate-in fade-in duration-150 font-sans">
                {/* Barra de Título da Seção */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 px-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-6 bg-[#9C1915] rounded-xs" />
                        <div>
                            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                Entregas As-Built por Empresa Contratada
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Selecione uma empresa para validar modelos 3D, pranchas 2D (.dwg/.pdf) e remessas quinzenais (SMs).
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={syncCloudMutation.isPending}
                            onClick={() => syncCloudMutation.mutate({ projectId })}
                            className="h-8 px-3 rounded-md border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold gap-1.5"
                            title="Consulta em modo somente leitura os links do SteclaCloud configurados para Ocle, Thá e AeB"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 text-[#9C1915] ${
                                    syncCloudMutation.isPending ? "animate-spin" : ""
                                }`}
                            />
                            {syncCloudMutation.isPending
                                ? "Verificando..."
                                : "Verificar Novas Entregas (Leitura)"}
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingEscopo(null);
                                setIsEscopoFormOpen(true);
                            }}
                            className="h-8 px-3 rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar Modelo ao Escopo
                        </Button>
                    </div>
                </div>

                {/* Grid de Cards das Empresas (Ocle, Thá, AeB) - Idêntico ao padrão de Apontamentos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {companyCardsData.map((comp) => (
                        <Card
                            key={comp.company}
                            onClick={() => {
                                setSelectedCompany(comp.company);
                                setFilterEdificacao("TODAS");
                                setFilterStatus("TODOS");
                                setSearchTerm("");
                                setSelectedIds([]);
                            }}
                            className="group cursor-pointer border border-slate-200 bg-white rounded-xl shadow-xs hover:border-[#9C1915] hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                        >
                            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-red-50 text-slate-700 group-hover:text-[#9C1915] flex items-center justify-center font-bold text-xs transition-colors">
                                        {comp.sigla}
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-900 group-hover:text-[#9C1915] transition-colors">
                                            {comp.company}
                                        </CardTitle>
                                        <span className="text-[10px] text-[#575756] font-medium">
                                            {comp.totalEdificacoes} edificações • {comp.total} modelos no escopo
                                        </span>
                                    </div>
                                </div>

                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#9C1915] transition-colors" />
                            </CardHeader>

                            <CardContent className="p-4 pt-3 space-y-3.5">
                                {/* Indicadores numéricos em 4 blocos limpos */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                                            Validados
                                        </span>
                                        <span className="text-sm font-bold text-emerald-600">
                                            {comp.validados}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                                            Pendentes
                                        </span>
                                        <span className="text-sm font-bold text-amber-600">
                                            {comp.comPendencias}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                                            Igual Proj.
                                        </span>
                                        <span className="text-sm font-bold text-[#9C1915]">
                                            {comp.igualProjeto}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                                            Faltam
                                        </span>
                                        <span className="text-sm font-bold text-slate-600">
                                            {comp.naoEntregues}
                                        </span>
                                    </div>
                                </div>

                                {/* Barra de Progresso de Entregas e Validação */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="font-semibold text-[#575756]">
                                            Modelos Validados
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {comp.approvalRate}% ({comp.validados}/{comp.total})
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                        {comp.validados > 0 && (
                                            <div
                                                className="h-full bg-emerald-500 transition-all"
                                                style={{
                                                    width: `${(comp.validados / Math.max(1, comp.total)) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {comp.comPendencias > 0 && (
                                            <div
                                                className="h-full bg-amber-500 transition-all"
                                                style={{
                                                    width: `${(comp.comPendencias / Math.max(1, comp.total)) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {comp.igualProjeto > 0 && (
                                            <div
                                                className="h-full bg-[#9C1915] transition-all"
                                                style={{
                                                    width: `${(comp.igualProjeto / Math.max(1, comp.total)) * 100}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Rodapé discreto: Pranchas 2D e Remessas SMs */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#575756]">
                                    <span>
                                        Pranchas 2D:{" "}
                                        <strong className="text-slate-800">
                                            {comp.pranchasValidadas}/{comp.totalPranchas}
                                        </strong>
                                    </span>
                                    <span>
                                        Remessas:{" "}
                                        <strong className="text-slate-800">
                                            {comp.totalPacotes} SMs
                                        </strong>
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Gráficos de Distribuição por Edificação de cada Empresa (mesmo padrão visual de Apontamentos) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
                    {companyCardsData.map((comp) => (
                        <Card
                            key={`chart-${comp.company}`}
                            className="border border-slate-200 bg-white rounded-xl shadow-xs p-3.5 overflow-hidden"
                        >
                            <CardHeader className="p-0 mb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#9C1915]" />
                                        <CardTitle className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                            {comp.company} • Por Edificação
                                        </CardTitle>
                                    </div>
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                        {comp.deliveredRate}% Recebido
                                    </span>
                                </div>
                            </CardHeader>

                            {comp.chartData.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400 italic">
                                    Nenhum modelo cadastrado.
                                </div>
                            ) : (
                                <div
                                    style={{
                                        height: `${Math.max(110, comp.chartData.length * 30 + 15)}px`,
                                    }}
                                    className="w-full"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={comp.chartData}
                                            layout="vertical"
                                            margin={{ left: 0, right: 38, top: 0, bottom: 0 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={110}
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
                                                dataKey="validado"
                                                stackId="a"
                                                name="Validado"
                                                fill="#10b981"
                                                barSize={15}
                                            />
                                            <Bar
                                                dataKey="pendente"
                                                stackId="a"
                                                name="Com Pendências"
                                                fill="#f59e0b"
                                                barSize={15}
                                            />
                                            <Bar
                                                dataKey="igualProjeto"
                                                stackId="a"
                                                name="Igual ao Projeto"
                                                fill="#9C1915"
                                                barSize={15}
                                            />
                                            <Bar
                                                dataKey="naoEntregue"
                                                stackId="a"
                                                name="Não Entregue"
                                                fill="#cbd5e1"
                                                radius={[0, 3, 3, 0]}
                                                barSize={15}
                                            >
                                                <LabelList
                                                    dataKey="resumo"
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
                            )}
                        </Card>
                    ))}
                </div>

                {isEscopoFormOpen && (
                    <ScopeFormModal
                        onClose={() => setIsEscopoFormOpen(false)}
                        escopo={editingEscopo}
                        projectId={projectId}
                    />
                )}
            </div>
        );
    }

    // =========================================================================
    // NÍVEL 2: PÁGINA INTERNA DA EMPRESA SELECIONADA (OCLE, THÁ OU AEB)
    // =========================================================================
    const currentCompanyStats = companyCardsData.find(
        (c) => c.company === selectedCompany
    );
    const allVisibleSelected =
        filteredCompanyEscopos.length > 0 &&
        filteredCompanyEscopos.every((e: any) => selectedIds.includes(e.id));

    return (
        <div className="space-y-3.5 animate-in fade-in duration-150 font-sans">
            {/* Header da Empresa Selecionada - Padrão Stecla (idêntico a DisciplineQualityMatrix) */}
            <div className="bg-white p-3.5 px-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSelectedCompany(null);
                            setSelectedIds([]);
                        }}
                        className="h-8 px-2.5 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 text-xs font-bold"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Todas as Empresas
                    </Button>

                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#9C1915] rounded-xs" />
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                                {selectedCompany} • Relação de Modelos & Projetos
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Resumo de Indicadores da Empresa + Ações */}
                <div className="flex flex-wrap items-center gap-2">
                    {currentCompanyStats && (
                        <>
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                                {currentCompanyStats.total} Modelos
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                                {currentCompanyStats.validados} Validados ({currentCompanyStats.approvalRate}%)
                            </span>
                            {currentCompanyStats.comPendencias > 0 && (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                                    {currentCompanyStats.comPendencias} Com Pendências
                                </span>
                            )}
                            {currentCompanyStats.igualProjeto > 0 && (
                                <span className="text-[11px] font-bold text-[#9C1915] bg-red-50 border border-red-200 px-2.5 py-1 rounded">
                                    {currentCompanyStats.igualProjeto} Igual ao Projeto
                                </span>
                            )}
                        </>
                    )}

                    {selectedIds.length > 0 && (
                        <Button
                            size="sm"
                            onClick={() => setIsQuinzenaModalOpen(true)}
                            className="h-7 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
                        >
                            <CalendarCheck2 className="w-3.5 h-3.5" />
                            Check-in Quinzena ({selectedIds.length})
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={syncCloudMutation.isPending}
                        onClick={() =>
                            syncCloudMutation.mutate({
                                projectId,
                                empresa: selectedCompany,
                            })
                        }
                        className="h-7 px-2.5 text-xs font-semibold border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-1.5"
                        title={`Verificar novas entregas no SteclaCloud de ${selectedCompany} (apenas leitura)`}
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 text-[#9C1915] ${
                                syncCloudMutation.isPending ? "animate-spin" : ""
                            }`}
                        />
                        {syncCloudMutation.isPending
                            ? "Verificando..."
                            : "Verificar Novas Entregas (Leitura)"}
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingEscopo({ empresa: selectedCompany });
                            setIsEscopoFormOpen(true);
                        }}
                        className="h-7 px-3 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-2xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Novo Modelo
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros, Busca e Alternância de Visão */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative min-w-[220px] max-w-sm flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            placeholder="Buscar disciplina, código do modelo ou parecer..."
                            className="pl-8 h-8 text-xs rounded-md border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-8 text-slate-700 focus:outline-none focus:border-[#9C1915] cursor-pointer"
                        value={filterEdificacao}
                        onChange={(e) => setFilterEdificacao(e.target.value)}
                    >
                        <option value="TODAS">Todas as Edificações ({companyEdificacoes.length})</option>
                        {companyEdificacoes.map((ed) => (
                            <option key={ed} value={ed}>
                                {ed}
                            </option>
                        ))}
                    </select>

                    {companySubView === "models" && (
                        <select
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-8 text-slate-700 focus:outline-none focus:border-[#9C1915] cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="TODOS">Todos os Status</option>
                            <option value="VALIDADO">Validado</option>
                            <option value="COM_PENDENCIAS">Com Pendências</option>
                            <option value="IGUAL_PROJETO">Igual ao Projeto</option>
                            <option value="NAO_ENTREGUE">Não Entregue</option>
                        </select>
                    )}
                </div>

                {/* Seletor discreto: Relação de Modelos vs Pacotes Quinzenais (SM) da empresa */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setCompanySubView("models")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                            companySubView === "models"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5 text-[#9C1915]" />
                        Modelos & Pranchas ({filteredCompanyEscopos.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setCompanySubView("packets")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                            companySubView === "packets"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <History className="w-3.5 h-3.5 text-[#9C1915]" />
                        Pacotes Quinzenais ({currentCompanyStats?.totalPacotes || 0} SMs)
                    </button>
                </div>
            </div>

            {/* SUB-VISÃO 1: TABELA DE MODELOS & PROJETOS NO PADRÃO STECLA */}
            {companySubView === "models" ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div
                        className="overflow-x-auto custom-scrollbar focus:outline-2 focus:outline-[#9C1915]/40"
                        tabIndex={0}
                        role="region"
                        aria-label={`Modelos As-Built de ${selectedCompany}`}
                    >
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px] h-9">
                                    <th className="py-2 px-3 w-10 text-center">
                                        <button
                                            type="button"
                                            onClick={toggleSelectAll}
                                            className="text-slate-500 hover:text-slate-800 flex items-center justify-center mx-auto"
                                            title="Selecionar todos para check-in quinzenal"
                                        >
                                            {allVisibleSelected ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-[#9C1915]" />
                                            ) : (
                                                <Square className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-2 px-3 w-52 max-w-[210px]">Disciplina / Modelo</th>
                                    <th className="py-2 px-3 w-36">Edificação</th>
                                    <th className="py-2 px-3 text-center w-24">Pranchas 2D</th>
                                    <th className="py-2 px-3 text-center w-24">Remessas</th>
                                    <th className="py-2 px-3 text-center w-40">Apontamentos</th>
                                    <th className="py-2 px-3 min-w-[240px]">Parecer / Observações</th>
                                    <th className="py-2 px-3 text-center w-36">Status</th>
                                    <th className="py-2 px-3 text-right w-32">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingEscopos ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-10 text-slate-400 italic">
                                            Carregando modelos...
                                        </td>
                                    </tr>
                                ) : filteredCompanyEscopos.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-10 text-slate-400 italic">
                                            Nenhum modelo encontrado para os filtros selecionados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCompanyEscopos.map((esc: any) => {
                                        const statusKey = esc.statusAuditoria || "NAO_ENTREGUE";
                                        const isChecked = selectedIds.includes(esc.id);
                                        const totalPranchas = esc.totalPranchas ?? 0;
                                        const pranchasValidadas = esc.pranchasValidadas ?? 0;

                                        // Verifica se este modelo (Disciplina + Edificação) possui apontamentos na verificação
                                        const targetEdif = normalizeEdificacao(esc.edificacao || "")
                                            .trim()
                                            .toLowerCase();
                                        const matchedIssues = apontamentos.filter((a: any) => {
                                            const aEdif = normalizeEdificacao(a.edificacao || "")
                                                .trim()
                                                .toLowerCase();
                                            const sameEdif =
                                                aEdif === targetEdif ||
                                                aEdif.includes(targetEdif) ||
                                                targetEdif.includes(aEdif);
                                            const sameDisc = isSameDiscipline(
                                                a.disciplina || "",
                                                esc.disciplina || ""
                                            );
                                            return sameEdif && sameDisc;
                                        });
                                        const pendingIssuesCount = matchedIssues.filter(
                                            (a: any) =>
                                                a.status === "ATIVA" || a.status === "EM_REVISAO"
                                        ).length;

                                        let statusBadge = {
                                            label: "NÃO ENTREGUE",
                                            cls: "bg-slate-100 text-slate-600 border-slate-200",
                                        };
                                        if (statusKey === "VALIDADO") {
                                            statusBadge = {
                                                label: "VALIDADO",
                                                cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
                                            };
                                        } else if (statusKey === "COM_PENDENCIAS") {
                                            statusBadge = {
                                                label: "COM PENDÊNCIAS",
                                                cls: "bg-amber-50 text-amber-700 border-amber-200",
                                            };
                                        } else if (statusKey === "IGUAL_PROJETO") {
                                            statusBadge = {
                                                label: "IGUAL PROJETO",
                                                cls: "bg-red-50 text-[#9C1915] border-red-200",
                                            };
                                        }

                                        return (
                                            <tr
                                                key={esc.id}
                                                onClick={() => setValidatingEscopo(esc)}
                                                className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                                                    isChecked ? "bg-red-50/30" : ""
                                                }`}
                                            >
                                                <td
                                                    className="py-2.5 px-3 text-center"
                                                    onClick={(e) => toggleSelectRow(esc.id, e)}
                                                >
                                                    <button
                                                        type="button"
                                                        className="text-slate-400 hover:text-[#9C1915] flex items-center justify-center mx-auto"
                                                    >
                                                        {isChecked ? (
                                                            <CheckSquare className="w-3.5 h-3.5 text-[#9C1915]" />
                                                        ) : (
                                                            <Square className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </td>

                                                <td className="py-2.5 px-3 w-52 max-w-[210px]">
                                                    <div className="font-bold text-slate-900 group-hover:text-[#9C1915] transition-colors truncate">
                                                        {esc.disciplina}
                                                    </div>
                                                    <div
                                                        className="font-mono text-[10px] text-slate-400 truncate max-w-[195px]"
                                                        title={esc.nomeModeloFinal || esc.nomeModelo}
                                                    >
                                                        {esc.nomeModeloFinal || esc.nomeModelo}
                                                    </div>
                                                </td>

                                                <td className="py-2.5 px-3 w-36 text-[11px] font-semibold text-[#575756]">
                                                    {esc.edificacao}
                                                </td>

                                                <td className="py-2.5 px-3 text-center font-bold">
                                                    {totalPranchas > 0 ? (
                                                        <span
                                                            className={`inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded text-[11px] ${
                                                                pranchasValidadas >= totalPranchas
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : pranchasValidadas > 0
                                                                    ? "bg-amber-50 text-amber-700"
                                                                    : "bg-slate-100 text-slate-700"
                                                            }`}
                                                        >
                                                            {pranchasValidadas} / {totalPranchas}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>

                                                <td
                                                    className="py-2.5 px-3 text-center"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEscopoTimeline(esc);
                                                    }}
                                                >
                                                    {esc.totalEntregas > 0 ? (
                                                        <span
                                                            className="inline-flex items-center justify-center whitespace-nowrap text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-[#9C1915] px-2 py-0.5 rounded transition-colors"
                                                            title="Ver histórico de SMs deste modelo"
                                                        >
                                                            {esc.totalEntregas} SMs
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 text-center">
                                                    {pendingIssuesCount > 0 ? (
                                                        <span
                                                            className="inline-flex items-center justify-center whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border bg-amber-50 text-amber-800 border-amber-200"
                                                            title="Este modelo possui apontamentos pendentes na verificação As-Built"
                                                        >
                                                            Com Apontamentos
                                                        </span>
                                                    ) : matchedIssues.length > 0 ? (
                                                        <span className="inline-flex items-center justify-center whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            Sanados
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 text-[11px] text-[#575756]">
                                                    {esc.parecerTecnico && esc.parecerTecnico !== "OK" ? (
                                                        <span className="line-clamp-1">{esc.parecerTecnico}</span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>

                                                <td className="py-2.5 px-3 text-center">
                                                    <span
                                                        className={`inline-flex items-center justify-center whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border ${statusBadge.cls}`}
                                                    >
                                                        {statusBadge.label}
                                                    </span>
                                                </td>

                                                <td
                                                    className="py-2.5 px-3.5 text-right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            className="h-7 px-3 text-[11px] font-bold rounded-md bg-[#9C1915] hover:bg-[#7D1411] text-white shadow-xs"
                                                            onClick={() => setValidatingEscopo(esc)}
                                                        >
                                                            Validar
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                                                            onClick={() => {
                                                                setEditingEscopo(esc);
                                                                setIsEscopoFormOpen(true);
                                                            }}
                                                            title="Editar cadastro"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                                            onClick={() => {
                                                                if (confirm("Remover este modelo do escopo?")) {
                                                                    deleteMutation.mutate({ id: esc.id });
                                                                }
                                                            }}
                                                            title="Excluir modelo"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* SUB-VISÃO 2: PACOTES QUINZENAIS (SMs) DA EMPRESA SELECIONADA */
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <PacketsListView
                        entregas={filteredCompanyEntregas}
                        onViewDetail={onViewEntrega}
                        onDelete={(id, e) => onDeleteEntrega?.(id, e)}
                    />
                </div>
            )}

            {/* Modal de Validação do Modelo (Status 3D + Pranchas 2D + Parecer + Check-in SM) */}
            {validatingEscopo && (
                <ModelValidationModal
                    projectId={projectId}
                    escopo={validatingEscopo}
                    apontamentos={apontamentos}
                    onClose={() => setValidatingEscopo(null)}
                />
            )}

            {/* Modal de Check-in Quinzenal em Lote (SMs) */}
            {isQuinzenaModalOpen && (
                <QuinzenaBatchModal
                    projectId={projectId}
                    selectedEscopos={selectedEscopoObjects}
                    onClose={() => setIsQuinzenaModalOpen(false)}
                    onSuccess={() => setSelectedIds([])}
                />
            )}

            {/* Modal de Cadastro/Edição de Modelo */}
            {isEscopoFormOpen && (
                <ScopeFormModal
                    onClose={() => setIsEscopoFormOpen(false)}
                    escopo={editingEscopo}
                    projectId={projectId}
                />
            )}
        </div>
    );
}
