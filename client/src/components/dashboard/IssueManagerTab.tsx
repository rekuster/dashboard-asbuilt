
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
    Pencil
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
import KPICard from "./KPICard";

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
        const active = issues.filter((i: any) => i.status === 'ATIVA' || i.status === 'EM_REVISAO').length;
        const resolved = issues.filter((i: any) => i.status === 'RESOLVIDA').length;
        const critical = issues.filter((i: any) => i.prioridade === 'ALTA' || i.prioridade === 'URGENTE').length;
        
        const qualityScore = total > 0 ? (resolved / total) * 100 : 100;

        return { total, active, resolved, critical, qualityScore };
    }, [issues]);

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard 
                    title="Total de Apontamentos" 
                    value={stats.total} 
                    subtitle="Registros totais no sistema" 
                    icon={BarChart3}
                />
                
                <KPICard 
                    title="Ativos / Pendentes" 
                    value={stats.active} 
                    subtitle={`${stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% do total`} 
                    icon={AlertCircle}
                    variant="orange"
                />

                <KPICard 
                    title="Apontamentos Sanados" 
                    value={stats.resolved} 
                    subtitle={`${stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}% de resolução`} 
                    icon={CheckCircle2}
                    variant="green"
                />

                <KPICard 
                    title="Índice de Qualidade" 
                    value={`${stats.qualityScore.toFixed(1)}%`} 
                    subtitle="Taxa de conformidade As-Built" 
                    icon={ShieldCheck}
                    variant="blue"
                />
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
