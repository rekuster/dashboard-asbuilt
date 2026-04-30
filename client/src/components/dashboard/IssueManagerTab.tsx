
// @ts-nocheck
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Search, 
    Filter, 
    Download, 
    ExternalLink, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    BarChart3,
    MoreHorizontal,
    Flag,
    Tag,
    User,
    Calendar,
    MessageSquare,
    Building2,
    ShieldCheck,
    Pencil,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditApontamentoModal } from "./EditApontamentoModal";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import KPICard from "./KPICard";
import { VerificationModal } from "./VerificationModal";

/**
 * MAPEAMENTO DE DISCIPLINAS (SIGLA -> NOME COMPLETO)
 */
const DISCIPLINE_MAPPING: Record<string, string> = {
    'ELE': 'Instalações Elétricas',
    'LOG': 'CFTV e Lógica',
    'HID': 'Instalações Hidrossanitárias',
    'UTI': 'Utilidades',
    'CLI': 'Climatização',
    'EST': 'Estrutura de Concreto',
    'MET': 'Estrutura Metálica',
    'ARQ': 'Arquitetura',
    'ELEMT': 'Média Tensão e Barramentos',
    'PCI': 'PCI',
    'SDAI': 'SDAI'
};

const isSameDiscipline = (apontamentoDisc: string, escopoDisc: string) => {
    const a = (apontamentoDisc || "").trim().toUpperCase();
    const e = (escopoDisc || "").trim().toUpperCase();
    if (a === e) return true;
    const mapped = DISCIPLINE_MAPPING[a];
    return mapped && mapped.toUpperCase() === e;
};

const normalizeEdificacao = (name: string) => {
    const n = (name || "").trim().toLowerCase();
    if (n === "produção") return "Prédio Produção";
    if (n === "suporte") return "Prédio Suporte";
    if (n === "central utilidades") return "Central de Utilidades";
    return name;
};

/**
 * ISSUE MANAGER TAB (ESTILO BIMCOLLAB)
 * Painel central para gestão de apontamentos, prioridades e resoluções.
 */

export default function IssueManagerTab() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("TODOS");
    const [priorityFilter, setPriorityFilter] = useState<string>("TODAS");
    const [disciplineFilter, setDisciplineFilter] = useState<string>("TODAS");

    const utils = trpc.useUtils();
    const { data: issues = [], isLoading } = trpc.dashboard.getApontamentos.useQuery();
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery();
    const { data: allVerificacoes = [] } = trpc.dashboard.getAllVerificacoes.useQuery();

    const [expandedDisciplines, setExpandedDisciplines] = useState<string[]>([]);
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [selectedDisciplineForModal, setSelectedDisciplineForModal] = useState<string>("");
    const [isVModalOpen, setIsVModalOpen] = useState(false);

    const updateStatusMutation = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: () => {
            utils.dashboard.getApontamentos.invalidate();
        }
    });

    // Mapeamento de Cores por Status
    const statusColors: Record<string, string> = {
        'ATIVA': 'bg-amber-100 text-amber-700 border-amber-200',
        'EM_REVISAO': 'bg-blue-100 text-blue-700 border-blue-200',
        'RESOLVIDA': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'NAO_PROCEDE': 'bg-slate-100 text-slate-700 border-slate-200',
    };

    // Mapeamento de Cores por Prioridade
    const priorityColors: Record<string, string> = {
        'BAIXA': 'text-slate-400',
        'NORMAL': 'text-blue-500',
        'ALTA': 'text-orange-500',
        'URGENTE': 'text-rose-600 font-black',
    };

    // Filtros e Busca
    const filteredIssues = useMemo(() => {
        return issues.filter((issue: any) => {
            const matchesSearch = 
                issue.divergencia?.toLowerCase().includes(search.toLowerCase()) ||
                issue.sala?.toLowerCase().includes(search.toLowerCase()) ||
                issue.responsavel?.toLowerCase().includes(search.toLowerCase());
            
            const matchesStatus = statusFilter === "TODOS" || issue.status === statusFilter;
            const matchesPriority = priorityFilter === "TODAS" || issue.prioridade === priorityFilter;
            const matchesDiscipline = disciplineFilter === "TODAS" || issue.disciplina === disciplineFilter;

            return matchesSearch && matchesStatus && matchesPriority && matchesDiscipline;
        }).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [issues, search, statusFilter, priorityFilter, disciplineFilter]);

    // Estatísticas para os Cards
    const stats = useMemo(() => {
        const total = issues.length;
        const activeIssuesList = issues.filter((i: any) => i.status === 'ATIVA' || i.status === 'EM_REVISAO');
        const active = activeIssuesList.length;
        const resolved = issues.filter((i: any) => i.status === 'RESOLVIDA').length;
        const critical = issues.filter((i: any) => i.prioridade === 'ALTA' || i.prioridade === 'URGENTE').length;
        
        const qualityScore = total > 0 ? (resolved / total) * 100 : 100;

        // Por Disciplina
        const discStats = {};
        activeIssuesList.forEach(i => {
            discStats[i.disciplina] = (discStats[i.disciplina] || 0) + 1;
        });
        const topDisc = Object.entries(discStats).sort((a, b) => b[1] - a[1])[0];

        // Por Responsável
        const respStats = {};
        activeIssuesList.forEach(i => {
            const resp = i.responsavel || "Não Atribuído";
            respStats[resp] = (respStats[resp] || 0) + 1;
        });
        const topResp = Object.entries(respStats).sort((a, b) => b[1] - a[1])[0];

        // Dados formatados para gráficos
        const discChartData = Object.entries(discStats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // Top 8 disciplinas

        const respChartData = Object.entries(respStats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // Top 8 responsáveis

        return { total, active, resolved, critical, qualityScore, topDisc, topResp, discChartData, respChartData };
    }, [issues]);

    // Lógica de Validação por Disciplina integrada
    const groupedValidation = useMemo(() => {
        const map: Record<string, Record<string, any[]>> = {};
        const availableDisciplines = Array.from(new Set(escopos.map((e: any) => e.disciplina)));

        salas.forEach((sala: any) => {
            const edifNorm = normalizeEdificacao(sala.edificacao);
            availableDisciplines.forEach(disc => {
                const discInBuilding = escopos.find((e: any) => 
                    e.disciplina === disc && normalizeEdificacao(e.edificacao) === edifNorm
                );
                
                if (discInBuilding) {
                    const verification = allVerificacoes.find((v: any) => v.salaId === sala.id && v.disciplina === disc);
                    const roomApontamentos = issues.filter((a: any) => 
                        a.sala === sala?.nome && isSameDiscipline(a.disciplina, disc)
                    );

                    const activeAp = roomApontamentos.filter((a: any) => a.status === 'ATIVA');
                    const revisionAp = roomApontamentos.filter((a: any) => a.status === 'EM_REVISAO');
                    const totalPending = activeAp.length + revisionAp.length;
                    const resolvedCount = roomApontamentos.length - totalPending;

                    if (roomApontamentos.length > 0) {
                        if (!map[disc]) map[disc] = {};
                        if (!map[disc][sala.edificacao]) map[disc][sala.edificacao] = [];
                        
                        map[disc][sala.edificacao].push({
                            ...sala,
                            statusDisciplina: (verification?.status === "OK" || (roomApontamentos.length > 0 && totalPending === 0)) ? "OK" : "ATIVA",
                            apontamentosCount: activeAp.length,
                            revisionCount: revisionAp.length,
                            totalPending: totalPending,
                            resolvedCount: resolvedCount,
                            totalIssues: roomApontamentos.length
                        });
                    }
                }
            });
        });
        return map;
    }, [salas, escopos, issues, allVerificacoes]);

    const activeDisciplines = Object.keys(groupedValidation).sort();

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await updateStatusMutation.mutateAsync({
                id,
                status,
                dataResolvido: status === 'RESOLVIDA' ? new Date() : null
            });
            toast.success(`Status atualizado para ${status}`);
        } catch (e) {
            toast.error("Erro ao atualizar status");
        }
    };

    const handleUpdatePriority = async (id: number, priority: string) => {
        try {
            await updateStatusMutation.mutateAsync({
                id,
                prioridade: priority
            });
            toast.success(`Prioridade atualizada para ${priority}`);
        } catch (e) {
            toast.error("Erro ao atualizar prioridade");
        }
    };

    const disciplines = Array.from(new Set(issues.map((i: any) => i.disciplina))).filter(Boolean).sort();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedApontamento, setSelectedApontamento] = useState<any>(null);

    const handleEditClick = (apont: any) => {
        setSelectedApontamento(apont);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6 font-sans pb-20">
            {/* Header com Stats */}
            {/* Header com Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Total Geral" 
                    value={stats.total} 
                    subtitle="Registros totais" 
                    icon={BarChart3}
                />
                
                <KPICard 
                    title="Ativos" 
                    value={stats.active} 
                    subtitle="Pendências em campo" 
                    icon={AlertCircle}
                    variant="orange"
                />

                <KPICard 
                    title="Resolvidos" 
                    value={stats.resolved} 
                    subtitle="Itens sanados" 
                    icon={CheckCircle2}
                    variant="green"
                />

                <KPICard 
                    title="Qualidade" 
                    value={`${stats.qualityScore.toFixed(1)}%`} 
                    subtitle="Taxa As-Built" 
                    icon={ShieldCheck}
                    variant="blue"
                />
            </div>

            {/* Gráficos de Distribuição */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
                    <CardHeader className="p-0 mb-6">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-[#940707]" />
                            <CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-tighter">Pendências por Disciplina</CardTitle>
                        </div>
                    </CardHeader>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.discChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={80} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} 
                                />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                />
                                <Bar dataKey="count" name="Pendências" fill="#940707" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
                    <CardHeader className="p-0 mb-6">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#940707]" />
                            <CardTitle className="text-[11px] font-black uppercase text-slate-500 tracking-tighter">Pendências por Responsável</CardTitle>
                        </div>
                    </CardHeader>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.respChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={80} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} 
                                />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                />
                                <Bar dataKey="count" name="Pendências" fill="#475569" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* SEÇÃO INTEGRADA: VALIDAÇÃO POR DISCIPLINA */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <ShieldCheck className="w-5 h-5 text-[#940707]" />
                    <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider">Ajustes As-Built por Disciplina</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {activeDisciplines.map(disc => {
                        const isExpanded = expandedDisciplines.includes(disc);
                        const edifs = Object.keys(groupedValidation[disc]);
                        let dTotalSalas = 0;
                        let dOkSalas = 0;
                        edifs.forEach(ed => {
                            groupedValidation[disc][ed].forEach(s => {
                                dTotalSalas++;
                                if (s.statusDisciplina === "OK") dOkSalas++;
                            });
                        });

                        return (
                            <Card key={disc} className="border-none shadow-sm overflow-hidden">
                                <CardHeader 
                                    className="py-3 px-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                                    onClick={() => {
                                        setExpandedDisciplines(prev => 
                                            prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
                                        );
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-[#940707]" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                            <span className="text-sm font-black text-slate-700 uppercase">{disc}</span>
                                            <Badge className="bg-slate-100 text-slate-500 border-none text-[9px]">{dOkSalas}/{dTotalSalas} Salas OK</Badge>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${(dOkSalas/dTotalSalas)*100}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                {isExpanded && (
                                    <CardContent className="p-0 border-t border-slate-50">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow className="h-8">
                                                    <TableHead className="text-[9px] uppercase font-bold px-5">Sala / Ambiente</TableHead>
                                                    <TableHead className="text-[9px] uppercase font-bold text-center">Divergências</TableHead>
                                                    <TableHead className="text-[9px] uppercase font-bold text-center">Status</TableHead>
                                                    <TableHead className="text-[9px] uppercase font-bold text-center">Ação</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {edifs.map(edif => (
                                                    groupedValidation[disc][edif].map(sala => (
                                                        <TableRow key={sala.id} className="h-10 hover:bg-slate-50/30">
                                                            <TableCell className="px-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-700">{sala.nome}</span>
                                                                    <span className="text-[9px] text-slate-400">{edif}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex justify-center gap-1">
                                                                    {sala.apontamentosCount > 0 && <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[9px]">{sala.apontamentosCount} ATIVA</Badge>}
                                                                    {sala.revisionCount > 0 && <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[9px]">{sala.revisionCount} AJUSTE</Badge>}
                                                                    {sala.apontamentosCount === 0 && sala.revisionCount === 0 && <span className="text-[9px] text-emerald-600 font-bold">SANADO</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${sala.statusDisciplina === "OK" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                                                    {sala.statusDisciplina}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-7 text-[10px] font-bold gap-1 hover:text-[#940707]"
                                                                    onClick={() => {
                                                                        setSelectedSala(sala);
                                                                        setSelectedDisciplineForModal(disc);
                                                                        setIsVModalOpen(true);
                                                                    }}
                                                                >
                                                                    <Pencil className="w-3 h-3" /> Conferir
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="h-px bg-slate-100 my-2" />
            
            <div className="flex items-center gap-2 px-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider">Lista Detalhada de Apontamentos</h3>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar por descrição, sala ou responsável..."
                        className="pl-9 rounded-full border-slate-200 focus:ring-[#940707]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                        className="text-xs font-bold bg-slate-50 border-none rounded-full px-4 py-2 focus:ring-0 cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="TODOS">Todos os Status</option>
                        <option value="ATIVA">Ativa</option>
                        <option value="EM_REVISAO">Em Revisão</option>
                        <option value="RESOLVIDA">Resolvida</option>
                        <option value="NAO_PROCEDE">Não Procede</option>
                    </select>

                    <select 
                        className="text-xs font-bold bg-slate-50 border-none rounded-full px-4 py-2 focus:ring-0 cursor-pointer"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                        <option value="TODAS">Todas Prioridades</option>
                        <option value="BAIXA">Baixa</option>
                        <option value="NORMAL">Normal</option>
                        <option value="ALTA">Alta</option>
                        <option value="URGENTE">Urgente</option>
                    </select>

                    <select 
                        className="text-xs font-bold bg-slate-50 border-none rounded-full px-4 py-2 focus:ring-0 cursor-pointer"
                        value={disciplineFilter}
                        onChange={(e) => setDisciplineFilter(e.target.value)}
                    >
                        <option value="TODAS">Todas Disciplinas</option>
                        {disciplines.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                <Button variant="outline" className="rounded-full gap-2 text-xs font-bold border-slate-200">
                    <Download className="w-4 h-4" />
                    Exportar BCF / Excel
                </Button>
            </div>

            {/* Tabela de Issues */}
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="w-[80px] text-[10px] font-black uppercase text-slate-400 px-6">ID</TableHead>
                            <TableHead className="w-[100px] text-[10px] font-black uppercase text-slate-400">Miniatura</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400">Informações Básicas</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400">Descrição / Divergência</TableHead>
                            <TableHead className="w-[120px] text-[10px] font-black uppercase text-slate-400 text-center">Status</TableHead>
                            <TableHead className="w-[120px] text-[10px] font-black uppercase text-slate-400 text-center">Prioridade</TableHead>
                            <TableHead className="w-[150px] text-[10px] font-black uppercase text-slate-400">Responsável</TableHead>
                            <TableHead className="w-[60px] text-center px-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">Carregando apontamentos...</TableCell>
                            </TableRow>
                        ) : filteredIssues.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">Nenhum apontamento encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            filteredIssues.map((issue: any) => (
                                <TableRow key={issue.id} className="group hover:bg-slate-50/50 border-slate-50 transition-colors">
                                    <TableCell className="px-6 font-mono text-[10px] text-slate-400">#{issue.id}</TableCell>
                                    <TableCell>
                                        <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in group-hover:shadow-md transition-shadow" onClick={() => window.open(issue.fotoUrl, '_blank')}>
                                            {issue.fotoUrl ? (
                                                <img src={issue.fotoUrl} alt="Issue" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <Tag className="w-3 h-3 text-[#940707]" />
                                                <span className="text-[11px] font-black uppercase tracking-tight text-[#940707]">{issue.disciplina}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Building2 className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">{issue.sala} ({issue.edificacao})</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[300px]">
                                            <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-relaxed">
                                                {issue.divergencia || "Sem descrição registrada."}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {issue.createdAt ? format(new Date(issue.createdAt), "dd MMM yy", { locale: ptBR }) : 'N/A'}
                                                </span>
                                                {issue.comentario && (
                                                    <span className="text-[9px] text-blue-500 flex items-center gap-1 font-bold">
                                                        <MessageSquare className="w-3 h-3" />
                                                        Comentário de revisão
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className={`h-7 px-3 rounded-full text-[10px] font-black uppercase border transition-all ${statusColors[issue.status] || statusColors['ATIVA']}`}>
                                                    {issue.status || 'ATIVA'}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center" className="rounded-xl border-slate-100">
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(issue.id, 'ATIVA')} className="text-xs font-bold text-amber-600">Marcar como Ativa</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(issue.id, 'EM_REVISAO')} className="text-xs font-bold text-blue-600">Enviar para Revisão</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(issue.id, 'RESOLVIDA')} className="text-xs font-bold text-emerald-600">Marcar como Resolvida</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(issue.id, 'NAO_PROCEDE')} className="text-xs font-bold text-slate-500">Não Procede</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className={`h-7 gap-1.5 text-[10px] font-black uppercase rounded-full hover:bg-slate-50 ${priorityColors[issue.prioridade || 'NORMAL']}`}>
                                                    <Flag className="w-3 h-3" />
                                                    {issue.prioridade || 'NORMAL'}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center" className="rounded-xl border-slate-100">
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(issue.id, 'BAIXA')} className="text-xs font-bold text-slate-400">Baixa</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(issue.id, 'NORMAL')} className="text-xs font-bold text-blue-500">Normal</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(issue.id, 'ALTA')} className="text-xs font-bold text-orange-500">Alta</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(issue.id, 'URGENTE')} className="text-xs font-bold text-rose-600">Urgente</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-[#940707]/10 flex items-center justify-center border border-[#940707]/20">
                                                <User className="w-3.5 h-3.5 text-[#940707]" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{issue.responsavel || "Não Atribuído"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100">
                                                <DropdownMenuItem className="text-xs font-medium gap-2">
                                                    <ExternalLink className="w-3.5 h-3.5" /> Ver Detalhes
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs font-medium gap-2">
                                                    <MessageSquare className="w-3.5 h-3.5" /> Adicionar Comentário
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-xs font-medium gap-2 text-blue-600"
                                                    onClick={() => handleEditClick(issue)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Editar Informações
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs font-medium gap-2 text-rose-600">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Excluir Apontamento
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {isVModalOpen && selectedSala && (
                <VerificationModal 
                    isOpen={isVModalOpen}
                    onClose={() => setIsVModalOpen(false)}
                    sala={selectedSala}
                    disciplines={[selectedDisciplineForModal]}
                    pendingApontamentos={{ [selectedDisciplineForModal]: selectedSala.totalPending }}
                />
            )}

            {selectedApontamento && (
                <EditApontamentoModal 
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedApontamento(null);
                    }}
                    apontamento={selectedApontamento}
                />
            )}
        </div>
    );
}
