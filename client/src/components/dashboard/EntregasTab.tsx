/*
 * ESTE ARQUIVO É A GESTÃO DE ENTREGAS AS-BUILT.
 * Aqui é onde você registra cada pacote de documentos ou modelos que os fornecedores (Thá, Ocle, AeB) enviam.
 * O sistema compara o que foi entregue com o "Escopo" (os 108 modelos) para te dizer o que falta.
 * Quando você valida uma entrega aqui, o Dashboard de Status é atualizado automaticamente.
 * 
 * EXPLICAÇÃO PARA O USUÁRIO:
 * Este componente é como uma "Central de Recebimento". Imagine que cada vez que chega um caminhão
 * com documentos ou modelos digitais, você anota aqui o que chegou. 
 * O sistema então marca na "Lista Mestra" o que já temos e o que falta.
 */

import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Search,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Edit2,
    Trash2,
    ArrowLeft,
    MessageSquare,
    History,
    Calendar,
    Building2,
    Layers,
    Briefcase,
    ClipboardCheck,
    ShieldCheck,
    ArrowUpDown,
    Loader2,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";
import KPICard from "./KPICard";
// Trocamos a aba de validação antiga pela nova, que foca em disciplinas

const STATUS_LABELS: Record<string, { label: string, color: string, icon: any }> = {
    'AGUARDANDO': { label: 'Mapeado', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    'RECEBIDO': { label: 'Recebido', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    'EM_REVISAO': { label: 'Em Revisão', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Search },
    'VALIDADO': { label: 'Validado (Final)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'VALIDADO_PARCIAL': { label: 'Validado (Parcial)', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: ClipboardCheck },
    'VALIDADO_RESSALVA': { label: 'Validado c/ Ressalva', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: ClipboardCheck },
    'REJEITADO': { label: 'Rejeitado', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

const DOC_TYPES: Record<string, string> = {
    'relatorio': 'Relatório',
    'dwg': 'DWG',
    'rvt': 'Revit (RVT)',
    'ifc': 'IFC',
    'pdf': 'PDF'
};

/**
 * COMPONENTE: VISÃO POR PACOTE (SM)
 * Esta função organiza a lista de entregas agrupando-as por "SM" ou "Pasta".
 * É útil para ver o que veio em cada remessa de uma vez só.
 */
function PacketsListView({ entregas, onViewDetail, onDelete }: { entregas: any[], onViewDetail: (e: any) => void, onDelete: (id: number, e: any) => void }) {
    const packets = useMemo(() => {
        const groups: Record<string, any[]> = {};
        entregas.forEach(e => {
            const id = e.identificadorEntrega || "Sem Identificação";
            if (!groups[id]) groups[id] = [];
            groups[id].push(e);
        });
        // Ordena pelos mais recentes (baseado no ID da primeira entrega do grupo)
        return Object.entries(groups).sort((a, b) => b[1][0].id - a[1][0].id);
    }, [entregas]);

    if (packets.length === 0) {
        return <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic">Nenhum pacote encontrado.</div>;
    }

    return (
        <div className="space-y-6 pt-2">
            {packets.map(([name, items]) => {
                const statusCount = items.reduce((acc: any, item: any) => {
                    acc[item.status] = (acc[item.status] || 0) + 1;
                    return acc;
                }, {});

                return (
                    <Card key={name} className="border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group/card">
                        <CardHeader className="py-3 px-5 bg-slate-50/80 flex flex-row items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm group-hover/card:border-primary/30 transition-colors">
                                    <Briefcase className="w-4 h-4 text-[#940707]" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight">{name}</CardTitle>
                                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        {items.length} {items.length === 1 ? 'modelo' : 'modelos'} • {items[0].empresaResponsavel}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {Object.entries(statusCount).map(([status, count]) => {
                                    const info = STATUS_LABELS[status] || STATUS_LABELS['AGUARDANDO'];
                                    return (
                                        <Badge key={status} variant="outline" className={`text-[9px] font-black px-2 py-0.5 rounded-full ${info.color}`}>
                                            {(count as any)} {info.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableBody>
                                    {items.map(item => {
                                        const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS['AGUARDANDO'];
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                            <TableRow 
                                                key={item.id} 
                                                className="hover:bg-slate-50/30 cursor-pointer h-12 group/row transition-colors border-slate-50"
                                                onClick={() => onViewDetail(item)}
                                            >
                                                <TableCell className="pl-6 text-[11px] font-bold text-slate-700 w-[35%]">
                                                    <div className="flex flex-col">
                                                        <span>{item.nomeDocumento}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium">Ref: {item.modeloBaseReferencia || 'N/A'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-slate-500 font-bold uppercase">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{item.disciplina}</span>
                                                        <span>{item.edificacao}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase flex items-center gap-1 w-fit ${statusInfo.color}`}>
                                                        <StatusIcon className="w-2.5 h-2.5" />
                                                        {statusInfo.label}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full" 
                                                            onClick={(e) => { e.stopPropagation(); onDelete(item.id, e); }}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}


export default function EntregasTab({ projectId, selectedEdificacao }: { projectId: string; selectedEdificacao?: string }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<any>(null);
    const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
    const [viewingDetail, setViewingDetail] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("list");
    const [viewMode, setViewMode] = useState<"table" | "packets">(() => (sessionStorage.getItem('entregas_view_mode') as any) || "table");

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        sessionStorage.setItem('entregas_active_tab', val);
    };

    const handleViewModeChange = (val: "table" | "packets") => {
        setViewMode(val);
        sessionStorage.setItem('entregas_view_mode', val);
    };
    const [filterEmpresa, setFilterEmpresa] = useState("todas");
    const [filterPacote, setFilterPacote] = useState("todos");
    const [filterStatus, setFilterStatus] = useState("todos"); // NOVO: Filtro por status
    // ESTADO DE ORDENAÇÃO:
    // Este estado guarda qual coluna o usuário clicou para ordenar (ex: "Data")
    // e se a ordem é crescente ('asc') ou decrescente ('desc').
    const [sortConfig, setSortConfig] = useState<{ 
        key: 'numeroEntrega' | 'dataRecebimento' | 'status' | null, 
        direction: 'asc' | 'desc' 
    }>({ 
        key: 'dataRecebimento', // Começa ordenado por Data
        direction: 'asc'        // Começa com as mais antigas primeiro (Padrão solicitado)
    });

    // FUNÇÃO DE ORDENAÇÃO:
    // Esta função é chamada quando o usuário clica em um cabeçalho da tabela.
    // Ela muda a coluna ativa ou inverte a direção se a coluna já for a ativa.
    const handleSort = (key: 'numeroEntrega' | 'dataRecebimento' | 'status') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const utils = trpc.useUtils();
    const { data: entregas = [], isLoading } = trpc.dashboard.getEntregas.useQuery({ projectId });
    const { data: stats } = trpc.dashboard.getEntregasStats.useQuery({ projectId, edificacao: selectedEdificacao });

    const deleteMutation = trpc.dashboard.deleteEntrega.useMutation({
        onSuccess: () => utils.dashboard.getEntregas.invalidate({ projectId })
    });

    // Mutação para atualização rápida de status diretamente na tabela
    const updateStatusMutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            // Invalida também os dados do dashboard principal
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
        }
    });

    const handleStatusChange = async (entrega: any, newStatus: string) => {
        try {
            await updateStatusMutation.mutateAsync({
                ...entrega,
                status: newStatus
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Falha ao atualizar status da entrega.");
        }
    };

    const filteredEntregas = useMemo(() => {
        return entregas.filter((e: any) => {
            const matchesSearch = !searchTerm || 
                e.nomeDocumento.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.empresaResponsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.identificadorEntrega && e.identificadorEntrega.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesEdif = !selectedEdificacao || e.edificacao === selectedEdificacao;
            const matchesEmpresa = filterEmpresa === "todas" || e.empresaResponsavel === filterEmpresa;
            const matchesPacote = filterPacote === "todos" || e.identificadorEntrega === filterPacote;
            const matchesStatus = filterStatus === "todos" || String(e.status).toUpperCase() === String(filterStatus).toUpperCase();
            
            return matchesSearch && matchesEdif && matchesEmpresa && matchesPacote && matchesStatus;
        }).sort((a: any, b: any) => {
            // LÓGICA DE ORDENAÇÃO DINÂMICA:
            // Pegamos a coluna que o usuário escolheu e comparamos os valores.
            if (sortConfig.key) {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                // Tratamento especial para DATAS (Transformar em número de milissegundos)
                if (sortConfig.key === 'dataRecebimento') {
                    valA = valA ? new Date(valA).getTime() : 0;
                    valB = valB ? new Date(valB).getTime() : 0;
                }
                
                // Comparação básica (Serve para Números e Strings de Status)
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            }

            // Fallback (Padrão caso não haja ordenação ou valores sejam iguais)
            // Se as datas forem iguais, ordena por ID crescente
            const dateA = a.dataRecebimento ? new Date(a.dataRecebimento).getTime() : 0;
            const dateB = b.dataRecebimento ? new Date(b.dataRecebimento).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;
            return a.id - b.id;
        });
    }, [entregas, searchTerm, selectedEdificacao, filterEmpresa, filterPacote, filterStatus, sortConfig]);

    // Opções únicas para os filtros (Normalizadas para evitar duplicata de maiúsculas/minúsculas)
    const empresasUnicas = useMemo(() => {
        const empresas = new Set(entregas.map((e: any) => {
            // Se for OCLE (qualquer caixa), normalize para Ocle para o filtro
            if (e.empresaResponsavel?.toUpperCase() === "OCLE") return "Ocle";
            return e.empresaResponsavel;
        }).filter(Boolean));
        return Array.from(empresas).sort();
    }, [entregas]);

    const pacotesUnicos = useMemo(() => {
        const pacotes = new Set(entregas.map((e: any) => e.identificadorEntrega).filter(Boolean));
        return Array.from(pacotes).sort();
    }, [entregas]);

    const handleEdit = (entrega: any) => {
        setEditingEntrega(entrega);
        setIsFormOpen(true);
    };

    const handleViewDetail = (entrega: any) => {
        setViewingDetail(entrega);
    };

    const handleDelete = async (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm("Deseja realmente excluir esta entrega?")) {
            await deleteMutation.mutateAsync({ id });
            if (viewingDetail?.id === id) setViewingDetail(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {viewingDetail ? (
                <EntregaDetailView
                    projectId={projectId}
                    entrega={viewingDetail}
                    onBack={() => setViewingDetail(null)}
                    onUpdate={() => {
                        utils.dashboard.getEntregas.invalidate({ projectId });
                        utils.dashboard.getEntregasStats.invalidate({ projectId });
                    }}
                    onEdit={() => handleEdit(viewingDetail)}
                    onDelete={() => handleDelete(viewingDetail.id)}
                />
            ) : (
                <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <KPICard title="Lista Mestra" value={stats?.total || 0} subtitle="Modelos Finais Esperados" />
                        <KPICard title="Mapeado" value={stats?.aguardando || 0} subtitle="Aguardando entrega" className="border-slate-200 bg-slate-50/50" />
                        <KPICard title="Recebidos" value={stats?.recebidos || 0} subtitle="Log de Entregas (SM)" className="border-blue-200 bg-blue-50/50" />
                        <KPICard title="Validados" value={(stats?.validados || 0) + (stats?.validadosRessalva || 0) + (stats?.validadosParcial || 0)} subtitle="Aprovados (Total)" className="border-emerald-200 bg-emerald-50/50" />
                        <KPICard title="Rejeitados" value={stats?.rejeitados || 0} subtitle="Necessitam correção" className="border-rose-200 bg-rose-50/50" />
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <TabsList className="grid grid-cols-4 w-full max-w-4xl bg-slate-100 p-1 rounded-xl">
                                <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                                    <History className="w-4 h-4 mr-2" />
                                    Gestão de Entregas
                                </TabsTrigger>
                                <TabsTrigger value="scope" className="rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Lista Mestra As Built
                                </TabsTrigger>
                            </TabsList>

                            {activeTab === "list" && (
                                <div className="flex bg-slate-100 p-1 rounded-lg self-end">
                                    <Button 
                                        variant={viewMode === "table" ? "ghost" : "ghost"} 
                                        className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${viewMode === "table" ? "bg-white shadow-sm text-[#940707]" : "text-slate-500"}`}
                                        onClick={() => handleViewModeChange("table")}
                                    >
                                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                                        Individual
                                    </Button>
                                    <Button 
                                        variant={viewMode === "packets" ? "ghost" : "ghost"} 
                                        className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${viewMode === "packets" ? "bg-white shadow-sm text-[#940707]" : "text-slate-500"}`}
                                        onClick={() => handleViewModeChange("packets")}
                                    >
                                        <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                                        Por Pacote (SM)
                                    </Button>
                                </div>
                            )}
                        </div>

                        <TabsContent value="list" className="space-y-4">
                            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Lista de Entregas As-Built
                                    </CardTitle>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="Buscar documento, empresa..."
                                                className="pl-9 w-[300px] bg-white/50 border-slate-200 focus:bg-white transition-all rounded-full"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                                                    <div className="flex items-center gap-2">
                                            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                                                <SelectTrigger className="w-[140px] h-9 rounded-full bg-white/50 border-slate-200 text-[11px] font-bold">
                                                    <SelectValue placeholder="Empresa" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="todas">Todas Empresas</SelectItem>
                                                    {empresasUnicas.map((emp: any) => (
                                                        <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={filterPacote} onValueChange={setFilterPacote}>
                                                <SelectTrigger className="w-[150px] h-9 rounded-full bg-white/50 border-slate-200 text-[11px] font-bold">
                                                    <SelectValue placeholder="Pacote / SM" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="todos">Todos Pacotes</SelectItem>
                                                    {pacotesUnicos.map((p: any) => (
                                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                                <SelectTrigger className="w-[140px] h-9 rounded-full bg-white/50 border-slate-200 text-[11px] font-bold">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="todos">Todos Status</SelectItem>
                                                    {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button
                                            className="rounded-full gap-2 shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606] text-white"
                                            onClick={() => {
                                                setEditingEntrega(null);
                                                setIsFormOpen(true);
                                            }}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nova Entrega
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* 
                                        AQUI É A LÓGICA DE VISÃO: 
                                        Se estiver em "Individual", mostra a tabela linha a linha.
                                        Se estiver em "Por Pacote", agrupa as entregas por SM/Pasta.
                                    */}
                                    {viewMode === "table" ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent border-slate-100 uppercase text-[10px] font-bold tracking-wider text-slate-500 italic">
                                                    <TableHead 
                                                        className="w-[70px] cursor-pointer hover:text-primary transition-colors group"
                                                        onClick={() => handleSort('numeroEntrega')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Nº
                                                            <ArrowUpDown className={`w-3 h-3 transition-opacity ${sortConfig.key === 'numeroEntrega' ? 'opacity-100 text-primary' : 'opacity-30 group-hover:opacity-100'}`} />
                                                        </div>
                                                    </TableHead>
                                                    <TableHead 
                                                        className="w-[140px] cursor-pointer hover:text-primary transition-colors group"
                                                        onClick={() => handleSort('dataRecebimento')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Data de Entrega
                                                            <ArrowUpDown className={`w-3 h-3 transition-opacity ${sortConfig.key === 'dataRecebimento' ? 'opacity-100 text-primary' : 'opacity-30 group-hover:opacity-100'}`} />
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="w-[120px]">Pacote / SM</TableHead>
                                                    <TableHead>Responsável</TableHead>
                                                    <TableHead>Edificação</TableHead>
                                                    <TableHead>Disciplina</TableHead>
                                                    <TableHead className="w-[200px]">Documento Entregue</TableHead>
                                                    <TableHead>Formato</TableHead>
                                                    <TableHead 
                                                        className="cursor-pointer hover:text-primary transition-colors group"
                                                        onClick={() => handleSort('status')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Status
                                                            <ArrowUpDown className={`w-3 h-3 transition-opacity ${sortConfig.key === 'status' ? 'opacity-100 text-primary' : 'opacity-30 group-hover:opacity-100'}`} />
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="text-right">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {isLoading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={10} className="text-center py-10 text-slate-400 italic">Carregando entregas...</TableCell>
                                                    </TableRow>
                                                ) : filteredEntregas.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={10} className="text-center py-10 text-slate-400 italic">Nenhuma entrega encontrada.</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredEntregas.map((entrega: any) => {
                                                        const statusInfo = STATUS_LABELS[entrega.status] || STATUS_LABELS['AGUARDANDO'];
                                                        const StatusIcon = statusInfo.icon;

                                                        return (
                                                            <TableRow
                                                                key={entrega.id}
                                                                className="hover:bg-slate-50/50 transition-colors border-slate-100 group cursor-pointer h-12"
                                                                onClick={() => handleViewDetail(entrega)}
                                                            >
                                                                <TableCell className="text-[11px] font-bold text-slate-400">
                                                                    {entrega.numeroEntrega || "-"}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-700">
                                                                    {entrega.dataRecebimento ? dayjs(entrega.dataRecebimento).format('DD/MM/YYYY') : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] font-bold text-[#940707]">
                                                                    {entrega.identificadorEntrega || "-"}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-700">{entrega.empresaResponsavel}</TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-700">{entrega.edificacao}</TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-700">{entrega.disciplina}</TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-700">{entrega.nomeDocumento}</TableCell>
                                                                <TableCell className="text-[11px] font-bold text-slate-400 italic">
                                                                    {DOC_TYPES[entrega.formato] || entrega.formato || entrega.tipoDocumento}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="w-fit" onClick={(e) => e.stopPropagation()}>
                                                                        <Select 
                                                                            value={entrega.status} 
                                                                            onValueChange={(val) => handleStatusChange(entrega, val)}
                                                                            disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === entrega.id}
                                                                        >
                                                                            <SelectTrigger className={`h-7 min-w-[120px] rounded-full border text-[9px] font-black uppercase px-2 flex items-center gap-1 hover:brightness-95 transition-all ${statusInfo.color}`}>
                                                                                {updateStatusMutation.isPending && updateStatusMutation.variables?.id === entrega.id ? (
                                                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                                                ) : null}
                                                                                <SelectValue placeholder="Status" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {Object.entries(STATUS_LABELS).map(([key, info]) => {
                                                                                    const Icon = info.icon;
                                                                                    return (
                                                                                        <SelectItem key={key} value={key} className="text-[10px] font-bold uppercase py-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Icon className="w-3 h-3" />
                                                                                                {info.label}
                                                                                            </div>
                                                                                        </SelectItem>
                                                                                    );
                                                                                })}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full"
                                                                            onClick={(e) => { e.stopPropagation(); handleEdit(entrega); }}>
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full"
                                                                            onClick={(e) => handleDelete(entrega.id, e)}>
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        /* VISÃO POR PACOTE (SM) */
                                        <PacketsListView 
                                            entregas={filteredEntregas} 
                                            onViewDetail={handleViewDetail} 
                                            onDelete={handleDelete}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>


                        <TabsContent value="scope">
                            <ScopeManagementView 
                                projectId={projectId}
                                entregas={entregas} 
                                selectedEdificacao={selectedEdificacao} 
                                onViewEntrega={handleViewDetail}
                            />
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {isFormOpen && (
                <EntregaForm
                    projectId={projectId}
                    onClose={() => setIsFormOpen(false)}
                    entrega={editingEntrega}
                    selectedEdificacao={selectedEdificacao}
                />
            )}

            {isBatchFormOpen && (
                <BatchEntregaForm
                    projectId={projectId}
                    onClose={() => setIsBatchFormOpen(false)}
                    selectedEdificacao={selectedEdificacao}
                />
            )}
        </div>
    );
}

// ------------------------------------------------------------------
// SCOPE MANAGEMENT VIEW (v2) — LISTA MESTRA + TIMELINE + VERIFICAÇÃO
// ------------------------------------------------------------------
function ScopeManagementView({ projectId, entregas, selectedEdificacao, onViewEntrega }: { projectId: string, entregas: any[], selectedEdificacao?: string, onViewEntrega: (e: any) => void }) {
    const [selectedEscopo, setSelectedEscopo] = useState<any>(null);
    const [isEscopoFormOpen, setIsEscopoFormOpen] = useState(false);
    const [editingEscopo, setEditingEscopo] = useState<any>(null);

    const [filterDisciplina, setFilterDisciplina] = useState("todas");
    const [filterEmpresa, setFilterEmpresa] = useState("todas");
    const [filterStatus, setFilterStatus] = useState("todos");
    const [groupByEdificacao, setGroupByEdificacao] = useState(true);

    const { data: escopos = [], isLoading: loadingEscopos } = trpc.dashboard.getEscopos.useQuery({ projectId });
    const utils = trpc.useUtils();
    const deleteMutation = trpc.dashboard.deleteEscopo.useMutation({
        onSuccess: () => utils.dashboard.getEscopos.invalidate({ projectId })
    });

    // Opções para os filtros
    const disciplinasUnicas = useMemo(() => {
        const discs = new Set(escopos.map((e: any) => e.disciplina).filter(Boolean));
        return Array.from(discs).sort();
    }, [escopos]);

    const empresasUnicas = useMemo(() => {
        const emps = new Set(escopos.map((e: any) => e.empresa).filter(Boolean));
        return Array.from(emps).sort();
    }, [escopos]);

    // Count entregas per escopo
    const entregasPerEscopo = useMemo(() => {
        const counts: Record<number, { total: number, validados: number, rejeitados: number, conformes: number, naoConformes: number, hasFinal: boolean }> = {};
        entregas.forEach((e: any) => {
            if (e.escopoId) {
                if (!counts[e.escopoId]) counts[e.escopoId] = { total: 0, validados: 0, rejeitados: 0, conformes: 0, naoConformes: 0, hasFinal: false };
                counts[e.escopoId].total++;
                if (e.status === 'VALIDADO') {
                    counts[e.escopoId].validados++;
                    counts[e.escopoId].hasFinal = true; // Se houver pelo menos uma final, marca como concluído
                }
                if (e.status === 'REJEITADO') counts[e.escopoId].rejeitados++;
                if (e.resultado === 'CONFORME') counts[e.escopoId].conformes++;
                if (e.resultado === 'NAO_CONFORME') counts[e.escopoId].naoConformes++;
            }
        });
        return counts;
    }, [entregas]);

    const filteredEscopos = useMemo(() => {
        return escopos.filter((e: any) => {
            const matchesEdif = !selectedEdificacao || e.edificacao === selectedEdificacao;
            const matchesDisc = filterDisciplina === "todas" || e.disciplina === filterDisciplina;
            const matchesEmp = filterEmpresa === "todas" || e.empresa === filterEmpresa;
            
            let matchesStatus = true;
            if (filterStatus !== "todos") {
                const counts = entregasPerEscopo[e.id] || { total: 0, validados: 0, hasFinal: false };
                const isConcluido = counts.hasFinal;
                matchesStatus = filterStatus === "validado" ? isConcluido : !isConcluido;
            }
            
            return matchesEdif && matchesDisc && matchesEmp && matchesStatus;
        });
    }, [escopos, selectedEdificacao, filterDisciplina, filterEmpresa, filterStatus, entregasPerEscopo]);

    const groupedEscopos = useMemo(() => {
        if (!groupByEdificacao) return { "Todos os Itens": filteredEscopos };
        
        const groups: Record<string, any[]> = {};
        filteredEscopos.forEach((e: any) => {
            const edif = e.edificacao || "Sem Edificação";
            if (!groups[edif]) groups[edif] = [];
            groups[edif].push(e);
        });
        // Sort groups alphabetically by building name
        return Object.fromEntries(Object.entries(groups).sort());
    }, [filteredEscopos, groupByEdificacao]);

    if (selectedEscopo) {
        return (
            <TimelineParciais
                escopo={selectedEscopo}
                onBack={() => setSelectedEscopo(null)}
                onViewEntrega={onViewEntrega}
            />
        );
    }

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Layers className="w-5 h-5 text-[#940707]" />
                            Lista Mestra — Escopo por Empresa
                        </CardTitle>
                        <CardDescription>Modelos esperados de cada construtora/instaladora</CardDescription>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Filtros da Lista Mestra */}
                        <div className="flex items-center gap-2">
                            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                                <SelectTrigger className="w-[140px] h-9 rounded-full bg-slate-50 border-slate-200 text-[11px] font-bold">
                                    <SelectValue placeholder="Responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todos Responsáveis</SelectItem>
                                    {empresasUnicas.map((emp: any) => (
                                        <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterDisciplina} onValueChange={setFilterDisciplina}>
                                <SelectTrigger className="w-[140px] h-9 rounded-full bg-slate-50 border-slate-200 text-[11px] font-bold">
                                    <SelectValue placeholder="Disciplina" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas Disciplinas</SelectItem>
                                    {disciplinasUnicas.map((disc: any) => (
                                        <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[120px] h-9 rounded-full bg-slate-50 border-slate-200 text-[11px] font-bold">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos Status</SelectItem>
                                    <SelectItem value="validado">Validado</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-9 px-4 rounded-full text-[10px] font-black uppercase transition-all ${groupByEdificacao ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
                                onClick={() => setGroupByEdificacao(!groupByEdificacao)}
                            >
                                <Building2 className="w-3 h-3 mr-2" />
                                {groupByEdificacao ? "Agrupado por Prédio" : "Lista Simples"}
                            </Button>
                        </div>

                        <Button
                            className="rounded-full gap-2 shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606] ml-auto"
                            onClick={() => { setEditingEscopo(null); setIsEscopoFormOpen(true); }}
                        >
                            <Plus className="w-4 h-4" />
                            Novo Item de Escopo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {loadingEscopos ? (
                            <div className="text-center py-20 text-slate-400 italic">Carregando lista mestra...</div>
                        ) : filteredEscopos.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                Nenhum item de escopo encontrado para os filtros selecionados.
                            </div>
                        ) : (
                            Object.entries(groupedEscopos).map(([groupName, items]) => (
                                <div key={groupName} className="space-y-3">
                                    {groupByEdificacao && (
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-px flex-1 bg-slate-100" />
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Building2 className="w-3.5 h-3.5 text-[#940707]/60" />
                                                {groupName}
                                            </h3>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                    )}
                                    <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50">
                                                <TableRow className="hover:bg-transparent border-slate-100">
                                                    <TableHead className="font-bold uppercase text-[9px] tracking-widest text-slate-400 h-10">Prazo</TableHead>
                                                    <TableHead className="font-bold uppercase text-[9px] tracking-widest text-slate-400 w-[300px]">Documento (Modelo Final)</TableHead>
                                                    <TableHead className="font-bold uppercase text-[9px] tracking-widest text-slate-400">Responsável</TableHead>
                                                    {!groupByEdificacao && <TableHead className="font-bold uppercase text-[9px] tracking-widest text-slate-400">Edificação</TableHead>}
                                                    <TableHead className="font-bold uppercase text-[9px] tracking-widest text-slate-400">Disciplina</TableHead>
                                                    <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest text-slate-400 whitespace-nowrap">RVT Nativo?</TableHead>
                                                    <TableHead className="font-bold uppercase text-[9px] tracking-widest text-slate-400 w-[150px]">Plano de Ação</TableHead>
                                                    <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest text-slate-400">Status</TableHead>
                                                    <TableHead className="text-right font-bold uppercase text-[9px] tracking-widest text-slate-400">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((esc: any) => {
                                                    const counts = entregasPerEscopo[esc.id] || { total: 0, validados: 0, conformes: 0, hasFinal: false };
                                                    const progress = counts.hasFinal ? 100 : (counts.total > 0 ? (counts.validados / counts.total) * 100 : 0);
                                                    const isConcluido = progress >= 100 || counts.hasFinal;
                                                    return (
                                                        <TableRow key={esc.id} className="hover:bg-slate-50/30 cursor-pointer group h-12 border-slate-50" onClick={() => setSelectedEscopo(esc)}>
                                                            <TableCell className="text-[11px] font-bold text-slate-400">01/06/2026</TableCell>
                                                            <TableCell className="text-[11px] font-bold text-[#940707] max-w-[300px] truncate" title={esc.nomeModeloFinal}>{esc.nomeModeloFinal || "SEM NOME DEFINIDO"}</TableCell>
                                                            <TableCell className="text-[11px] font-bold text-slate-700">{esc.empresa}</TableCell>
                                                            {!groupByEdificacao && <TableCell className="text-[11px] font-bold text-slate-700">{esc.edificacao}</TableCell>}
                                                            <TableCell>
                                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">{esc.disciplina}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {esc.temRvtOriginal === 1 ? (
                                                                    <Badge variant="outline" className="text-[8px] bg-emerald-50 text-emerald-600 border-emerald-100 font-black">SIM</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[8px] bg-rose-50 text-rose-600 border-rose-100 font-black">NÃO</Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-[10px] font-medium text-slate-500 italic max-w-[150px] truncate" title={esc.acaoRvt || esc.pendenciaRvt}>
                                                                {esc.acaoRvt || esc.pendenciaRvt || "-"}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant={isConcluido ? "secondary" : "outline"} className={`text-[9px] font-black px-2 py-0.5 ${isConcluido ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                                                                    {isConcluido ? "VALIDADO" : "PENDENTE"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full"
                                                                        onClick={(e) => { e.stopPropagation(); setEditingEscopo(esc); setIsEscopoFormOpen(true); }}>
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm("Excluir este item de escopo?")) deleteMutation.mutate({ id: esc.id });
                                                                        }}>
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {isEscopoFormOpen && (
                <EscopoForm
                    projectId={projectId}
                    escopo={editingEscopo}
                    selectedEdificacao={selectedEdificacao}
                    onClose={() => setIsEscopoFormOpen(false)}
                />
            )}
        </div>
    );
}

// ------------------------------------------------------------------
// ESCOPO FORM MODAL
// ------------------------------------------------------------------
function EscopoForm({ projectId, escopo, selectedEdificacao, onClose }: { projectId: string, escopo?: any, selectedEdificacao?: string, onClose: () => void }) {
    const utils = trpc.useUtils();
    const mutation = trpc.dashboard.upsertEscopo.useMutation({
        onSuccess: () => {
            utils.dashboard.getEscopos.invalidate({ projectId });
            onClose();
        },
        onError: (error) => alert("Erro ao salvar: " + error.message)
    });

    const [formData, setFormData] = useState({
        id: escopo?.id,
        empresa: escopo?.empresa || "",
        disciplina: escopo?.disciplina || "",
        edificacao: escopo?.edificacao || selectedEdificacao || "",
        nomeModelo: escopo?.nomeModelo || "",
        nomeModeloFinal: escopo?.nomeModeloFinal || "",
        temRvtOriginal: escopo?.temRvtOriginal ?? 1,
        pendenciaRvt: escopo?.pendenciaRvt || "",
        acaoRvt: escopo?.acaoRvt || "",
        descricao: escopo?.descricao || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-[#940707] p-6 text-white">
                    <h2 className="text-xl font-bold">{escopo ? 'Editar Item de Escopo' : 'Novo Item de Escopo'}</h2>
                    <p className="text-white/70 text-sm">Defina o modelo esperado de cada empresa</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Empresa *</label>
                            <Input required value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} placeholder="Ex: Ocle" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Disciplina *</label>
                            <Input required value={formData.disciplina} onChange={e => setFormData({ ...formData, disciplina: e.target.value })} placeholder="Ex: Hidrossanitário" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Edificação *</label>
                            <Input required value={formData.edificacao} onChange={e => setFormData({ ...formData, edificacao: e.target.value })} placeholder="Ex: Bloco A" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Modelo Final</label>
                            <Input value={formData.nomeModeloFinal} onChange={e => setFormData({ ...formData, nomeModeloFinal: e.target.value })} placeholder="Ex: Hidro_BlocoA_AsBuilt.rvt" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Caminho / Modelo Base (Projeto) *</label>
                            <Input required value={formData.nomeModelo} onChange={e => setFormData({ ...formData, nomeModelo: e.target.value })} placeholder="Ex: Hidro_BlocoA.rvt" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Possui Revit Projetista? *</label>
                            <select 
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm"
                                value={formData.temRvtOriginal}
                                onChange={e => setFormData({ ...formData, temRvtOriginal: parseInt(e.target.value) })}
                            >
                                <option value={1}>Sim (RVT Nativo)</option>
                                <option value={0}>Não (IFC ou Outro)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Descrição do Problema / Pendência RVT</label>
                            <Input 
                                value={formData.pendenciaRvt} 
                                onChange={e => setFormData({ ...formData, pendenciaRvt: e.target.value })} 
                                placeholder="Ex: Projetista só enviou IFC" 
                                className="rounded-xl border-slate-200" 
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Plano de Ação (Ação Tomada)</label>
                            <Input 
                                value={formData.acaoRvt} 
                                onChange={e => setFormData({ ...formData, acaoRvt: e.target.value })} 
                                placeholder="Ex: Solicitado nativo via e-mail / Converter IFC para RVT" 
                                className="rounded-xl border-slate-200 bg-emerald-50/20" 
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Observações Gerais</label>
                            <Textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} placeholder="Observações sobre este escopo..." className="resize-none rounded-xl border-slate-200 min-h-[80px]" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
                        <Button type="submit" disabled={mutation.isPending} className="rounded-full px-8 bg-[#940707] hover:bg-[#7a0606] text-white">
                            {mutation.isPending ? 'Salvando...' : (escopo ? 'Salvar' : 'Criar Item')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// TIMELINE DE PARCIAIS (Detail view for a scope item)
// ------------------------------------------------------------------
function TimelineParciais({ escopo, onBack, onViewEntrega }: { escopo: any, onBack: () => void, onViewEntrega: (e: any) => void }) {
    const [isParcialFormOpen, setIsParcialFormOpen] = useState(false);
    const [verificandoId, setVerificandoId] = useState<number | null>(null);

    const { data: parciais = [], isLoading } = trpc.dashboard.getEntregasByEscopo.useQuery({ escopoId: escopo.id });
    const utils = trpc.useUtils();

    const validados = parciais.filter((p: any) => p.status === 'VALIDADO').length;
    const rejeitados = parciais.filter((p: any) => p.status === 'REJEITADO').length;
    const aguardando = parciais.filter((p: any) => p.status === 'AGUARDANDO' || p.status === 'RECEBIDO' || p.status === 'EM_REVISAO').length;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack} className="rounded-full gap-2 hover:bg-white/50">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-600 font-medium">Voltar à Lista Mestra</span>
                </Button>
            </div>

            {/* Escopo Header */}
            <Card className="border-none shadow-xl bg-gradient-to-r from-[#940707]/5 to-white/70 backdrop-blur-md">
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{escopo.nomeModelo}</h2>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="px-3 py-1 bg-[#940707]/10 text-[#940707] rounded-full text-xs font-bold">{escopo.empresa}</span>
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{escopo.disciplina}</span>
                                <span className="text-sm text-slate-400">•</span>
                                <span className="text-sm text-slate-500 font-medium">{escopo.edificacao}</span>
                                {escopo.nomeModeloFinal && (
                                    <>
                                        <span className="text-sm text-slate-400">•</span>
                                        <span className="text-sm text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]" title={`Modelo Final: ${escopo.nomeModeloFinal}`}>
                                            Final: {escopo.nomeModeloFinal}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-4 text-center">
                            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border">
                                <div className="text-2xl font-bold text-slate-800">{parciais.length}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Parciais</div>
                            </div>
                            <div className="px-4 py-2 bg-emerald-50 rounded-xl shadow-sm border border-emerald-100">
                                <div className="text-2xl font-bold text-emerald-600">{validados}</div>
                                <div className="text-[10px] font-bold text-emerald-500 uppercase">Validados</div>
                            </div>
                            <div className="px-4 py-2 bg-amber-50 rounded-xl shadow-sm border border-amber-100">
                                <div className="text-2xl font-bold text-amber-600">{aguardando}</div>
                                <div className="text-[10px] font-bold text-amber-500 uppercase">Pendentes</div>
                            </div>
                            {rejeitados > 0 && (
                                <div className="px-4 py-2 bg-rose-50 rounded-xl shadow-sm border border-rose-100">
                                    <div className="text-2xl font-bold text-rose-600">{rejeitados}</div>
                                    <div className="text-[10px] font-bold text-rose-500 uppercase">Rejeitados</div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Parciais List */}
            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <History className="w-5 h-5 text-[#940707]" />
                        Entregas Parciais
                    </CardTitle>
                    {/* Botão removido conforme solicitação do usuário */}
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center py-10 text-slate-400 italic">Carregando parciais...</p>
                    ) : parciais.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium">Nenhuma entrega parcial registrada</p>
                            <p className="text-sm mt-1">Clique em "Registrar Parcial" ao receber um modelo da empresa</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {parciais.map((parcial: any, idx: number) => {
                                const statusInfo = STATUS_LABELS[parcial.status] || STATUS_LABELS['AGUARDANDO'];
                                const StatusIcon = statusInfo.icon;
                                const isVerifying = verificandoId === parcial.id;

                                return (
                                    <div 
                                        key={parcial.id} 
                                        className="border rounded-xl p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => onViewEntrega(parcial)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                                                    #{parciais.length - idx}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-700">{parcial.nomeDocumento}</div>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                                        {parcial.periodoInicio && parcial.periodoFim && (
                                                            <>
                                                                <Calendar className="w-3 h-3" />
                                                                <span>{dayjs(parcial.periodoInicio).format('DD/MM')} a {dayjs(parcial.periodoFim).format('DD/MM/YYYY')}</span>
                                                                <span>•</span>
                                                            </>
                                                        )}
                                                        <span>Recebido: {parcial.dataRecebimento ? dayjs(parcial.dataRecebimento).format('DD/MM/YYYY') : 'Não recebido'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {parcial.resultado && (
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${parcial.resultado === 'CONFORME'
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                                                        }`}>
                                                        {parcial.resultado === 'CONFORME' ? '✓ Conforme' : '✗ Não Conforme'}
                                                    </span>
                                                )}
                                                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${statusInfo.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusInfo.label}
                                                </div>

                                                {!parcial.resultado && (parcial.status === 'RECEBIDO' || parcial.status === 'EM_REVISAO') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-full text-xs border-[#940707] text-[#940707] hover:bg-[#940707] hover:text-white"
                                                        onClick={() => setVerificandoId(isVerifying ? null : parcial.id)}
                                                    >
                                                        <Search className="w-3 h-3 mr-1" />
                                                        Verificar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Verification Panel (inline) */}
                                        {isVerifying && (
                                            <VerificacaoPanel
                                                entregaId={parcial.id}
                                                onDone={() => {
                                                    setVerificandoId(null);
                                                    utils.dashboard.getEntregasByEscopo.invalidate({ escopoId: escopo.id });
                                                    utils.dashboard.getEntregas.invalidate();
                                                    utils.dashboard.getEntregasStats.invalidate();
                                                }}
                                                onCancel={() => setVerificandoId(null)}
                                            />
                                        )}

                                        {/* Show apontamentos if rejected */}
                                        {parcial.resultado === 'NAO_CONFORME' && parcial.apontamentosVerificacao && (
                                            <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                                                <span className="text-[10px] font-bold uppercase text-rose-500">Apontamentos:</span>
                                                <p className="text-sm text-rose-700 mt-1">{parcial.apontamentosVerificacao}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isParcialFormOpen && (
                <ParcialForm
                    escopo={escopo}
                    parcialCount={parciais.length}
                    onClose={() => setIsParcialFormOpen(false)}
                />
            )}
        </div>
    );
}

// ------------------------------------------------------------------
// VERIFICAÇÃO PANEL (inline)
// ------------------------------------------------------------------
function VerificacaoPanel({ entregaId, onDone, onCancel }: { entregaId: number, onDone: () => void, onCancel: () => void }) {
    const [resultado, setResultado] = useState<string>('');
    const [apontamentos, setApontamentos] = useState('');

    const mutation = trpc.dashboard.registrarVerificacao.useMutation({
        onSuccess: () => onDone(),
        onError: (error) => alert("Erro ao registrar verificação: " + error.message)
    });

    const handleSubmit = () => {
        if (!resultado) return alert("Selecione o resultado da verificação.");
        if (resultado === 'NAO_CONFORME' && !apontamentos.trim()) return alert("Informe os apontamentos para itens não conformes.");
        mutation.mutate({
            id: entregaId,
            resultado,
            apontamentosVerificacao: apontamentos || null
        });
    };

    return (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-3 duration-300">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#940707]" />
                Registrar Verificação
            </h4>
            <div className="flex gap-3 mb-3">
                <button
                    type="button"
                    className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${resultado === 'CONFORME'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-400 hover:border-emerald-200'
                        }`}
                    onClick={() => setResultado('CONFORME')}
                >
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                    Conforme
                </button>
                <button
                    type="button"
                    className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${resultado === 'NAO_CONFORME'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-slate-400 hover:border-rose-200'
                        }`}
                    onClick={() => setResultado('NAO_CONFORME')}
                >
                    <XCircle className="w-5 h-5 mx-auto mb-1" />
                    Não Conforme
                </button>
            </div>
            {resultado === 'NAO_CONFORME' && (
                <div className="mb-3">
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Apontamentos *</label>
                    <Textarea
                        value={apontamentos}
                        onChange={(e) => setApontamentos(e.target.value)}
                        placeholder="Descreva as divergências encontradas..."
                        className="resize-none rounded-xl border-slate-200 min-h-[80px] mt-1"
                    />
                </div>
            )}
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-full">Cancelar</Button>
                <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={mutation.isPending || !resultado}
                    className="rounded-full px-6 bg-[#940707] hover:bg-[#7a0606] text-white"
                >
                    {mutation.isPending ? 'Salvando...' : 'Confirmar Verificação'}
                </Button>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// PARCIAL FORM (Quick form to register a new partial delivery)
// ------------------------------------------------------------------
function ParcialForm({ escopo, parcialCount, onClose }: { escopo: any, parcialCount: number, onClose: () => void }) {
    const utils = trpc.useUtils();
    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregasByEscopo.invalidate({ escopoId: escopo.id });
            utils.dashboard.getEntregas.invalidate();
            utils.dashboard.getEntregasStats.invalidate();
            onClose();
        },
        onError: (error) => alert("Erro ao registrar parcial: " + error.message)
    });

    const nextNum = parcialCount + 1;
    const [formData, setFormData] = useState({
        nomeDocumento: `Parcial #${nextNum} — ${escopo.nomeModelo}`,
        tipoDocumento: 'rvt',
        edificacao: escopo.edificacao,
        disciplina: escopo.disciplina,
        empresaResponsavel: escopo.empresa,
        dataPrevista: dayjs().format('YYYY-MM-DD'),
        dataRecebimento: dayjs().format('YYYY-MM-DD'),
        periodoInicio: '',
        periodoFim: '',
        status: 'RECEBIDO',
        descricao: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            escopoId: escopo.id,
            dataRecebimento: formData.dataRecebimento || null,
            periodoInicio: formData.periodoInicio || null,
            periodoFim: formData.periodoFim || null,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-[#940707] p-6 text-white">
                    <h2 className="text-xl font-bold">Registrar Entrega Parcial</h2>
                    <p className="text-white/70 text-sm">{escopo.empresa} — {escopo.disciplina} — {escopo.edificacao}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Documento</label>
                        <Input value={formData.nomeDocumento} onChange={e => setFormData({ ...formData, nomeDocumento: e.target.value })} className="rounded-xl border-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Período Início</label>
                            <Input type="date" value={formData.periodoInicio} onChange={e => setFormData({ ...formData, periodoInicio: e.target.value })} className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Período Fim</label>
                            <Input type="date" value={formData.periodoFim} onChange={e => setFormData({ ...formData, periodoFim: e.target.value })} className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Data Recebimento</label>
                            <Input type="date" value={formData.dataRecebimento} onChange={e => setFormData({ ...formData, dataRecebimento: e.target.value })} className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Status</label>
                            <select className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1">Observações</label>
                        <Textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} placeholder="Notas..." className="resize-none rounded-xl border-slate-200 min-h-[60px]" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
                        <Button type="submit" disabled={mutation.isPending} className="rounded-full px-8 bg-[#940707] hover:bg-[#7a0606] text-white">
                            {mutation.isPending ? 'Salvando...' : 'Registrar'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}



// ------------------------------------------------------------------
// DETAIL VIEW COMPONENT
// ------------------------------------------------------------------
function EntregaDetailView({ projectId, entrega, onBack, onUpdate, onEdit, onDelete }: any) {
    const utils = trpc.useUtils();
    const [status, setStatus] = useState(entrega.status);
    const [comentario, setComentario] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });
    const { data: historico = [] } = trpc.dashboard.getHistoricoEntrega.useQuery({ id: entrega.id });

    const linkedScope = useMemo(() => escopos.find((s: any) => s.id === entrega.escopoId), [escopos, entrega.escopoId]);

    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getHistoricoEntrega.invalidate({ id: entrega.id });
            onUpdate();
            setComentario("");
            setIsUpdating(false);
        },
        onError: (error) => {
            alert("Erro ao atualizar entrega: " + error.message);
            setIsUpdating(false);
        }
    });

    // Esta função atualiza o status da entrega (ex: de "Recebido" para "Validado").
    // Foi ajustada para enviar as datas como texto (YYYY-MM-DD), evitando erros de fuso horário.
    const handleUpdateStatus = () => {
        setIsUpdating(true);
        mutation.mutate({
            ...entrega,
            // Convertemos a data para texto simples para o servidor não se confundir com o fuso horário
            dataPrevista: dayjs(entrega.dataPrevista).format('YYYY-MM-DD'),
            dataRecebimento: entrega.dataRecebimento ? dayjs(entrega.dataRecebimento).format('YYYY-MM-DD') : undefined,
            status,
            comentario: comentario || undefined
        });
    };

    // Esta função salva apenas um comentário novo na entrega.
    const handleSendComment = () => {
        if (!comentario.trim()) return;
        setIsUpdating(true);
        mutation.mutate({
            ...entrega,
            dataPrevista: dayjs(entrega.dataPrevista).format('YYYY-MM-DD'),
            dataRecebimento: entrega.dataRecebimento ? dayjs(entrega.dataRecebimento).format('YYYY-MM-DD') : undefined,
            status: status,
            comentario: comentario
        });
    };

    const toggleCheckpointBep = (itemId: string) => {
        try {
            const currentCb = JSON.parse(entrega.checkpointBep || '{}');
            const newCb = {
                ...currentCb,
                [itemId]: !currentCb[itemId]
            };
            
            mutation.mutate({
                ...entrega,
                // Mantemos o padrão de enviar data como texto para evitar desvios
                dataPrevista: dayjs(entrega.dataPrevista).format('YYYY-MM-DD'),
                dataRecebimento: entrega.dataRecebimento ? dayjs(entrega.dataRecebimento).format('YYYY-MM-DD') : undefined,
                checkpointBep: JSON.stringify(newCb)
            });
        } catch (e) {
            console.error("Erro ao converter checklist BEP:", e);
        }
    };

    const statusInfo = STATUS_LABELS[entrega.status] || STATUS_LABELS['AGUARDANDO'];
    const StatusIcon = statusInfo.icon;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack} className="rounded-full gap-2 hover:bg-white/50">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-600 font-medium">Voltar</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{entrega.nomeDocumento}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                        </div>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{DOC_TYPES[entrega.tipoDocumento]}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl gap-2 border border-slate-200" onClick={onEdit}>
                        <Edit2 className="w-4 h-4" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl gap-2 border border-slate-200" onClick={onDelete}>
                        <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg bg-white/80">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" /> Informações da Entrega
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">Nº Controle</span>
                                <p className="font-bold text-[#940707]">{entrega.numeroEntrega || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> Pacote / SM</span>
                                <p className="font-semibold text-slate-700">{entrega.identificadorEntrega || "-"}</p>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> Modelo Lista Mestra</span>
                                <p className="font-bold text-slate-800">{linkedScope?.nomeModeloFinal || linkedScope?.nomeModelo || "Não vinculado"}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><History className="w-3 h-3" /> Formato</span>
                                <Badge variant="outline" className="font-bold uppercase bg-slate-50">{entrega.formato || "-"}</Badge>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Data de Entrega</span>
                                <p className="font-semibold text-slate-700">{entrega.dataRecebimento ? dayjs(entrega.dataRecebimento).format('DD/MM/YYYY') : "Faltando"}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Building2 className="w-3 h-3" /> Edificação</span>
                                <p className="font-semibold text-slate-700">{entrega.edificacao}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Layers className="w-3 h-3" /> Disciplina</span>
                                <p className="font-semibold text-slate-700">{entrega.disciplina}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Briefcase className="w-3 h-3" /> Fornecedor</span>
                                <p className="font-semibold text-slate-700">{entrega.empresaResponsavel}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Layers className="w-3 h-3" /> Modelo Base</span>
                                <p className="font-semibold text-slate-700 break-all" title={entrega.modeloBaseReferencia}>{entrega.modeloBaseReferencia || "-"}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ações Necessárias / Pós Entrega</span>
                                <p className="font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{entrega.acoesNecessarias || "Nenhuma ação pendente"}</p>
                            </div>
                        </div>


                        <div className="pt-4 border-t border-slate-100 space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Descrição da Entrega</span>
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl italic">
                                {entrega.descricao || "Nenhuma descrição fornecida."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-lg bg-white/80">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Gerenciamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Novo Status</label>
                                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm border-slate-200" value={status} onChange={e => setStatus(e.target.value)}>
                                    {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Comentário</label>
                                <Textarea placeholder="Comentários..." className="resize-none rounded-xl border-slate-200 min-h-[100px]" value={comentario} onChange={(e) => setComentario(e.target.value)} />
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1 bg-slate-500 hover:bg-slate-600 text-white rounded-xl" onClick={handleUpdateStatus} disabled={isUpdating}>{isUpdating ? 'Salvando...' : 'Atualizar Status'}</Button>
                                <Button variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl" onClick={handleSendComment} disabled={isUpdating || !comentario.trim()}>Comentar</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-white/80">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Histórico</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {historico.length === 0 ? <p className="text-center text-sm text-slate-400 py-4">Nenhum histórico.</p> : historico.map((h: any) => (
                                    <div key={h.id} className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="mt-1">
                                            {h.acao === 'CRIADO' && <Plus className="w-4 h-4 text-emerald-500" />}
                                            {h.acao === 'STATUS_ALTERADO' && <Edit2 className="w-4 h-4 text-amber-500" />}
                                            {h.acao === 'COMENTARIO' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-600 uppercase">{h.acao}</span>
                                                <span className="text-[10px] text-slate-400">{dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1">{h.descricao}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// FORM COMPONENT
// ------------------------------------------------------------------
function EntregaForm({ projectId, onClose, entrega, selectedEdificacao }: any) {
    const utils = trpc.useUtils();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });
    const { data: allEntregas = [] } = trpc.dashboard.getEntregas.useQuery({ projectId });
    
    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
        },
        onError: (error) => alert("Erro ao salvar: " + error.message)
    });

    // Extrair dados únicos dos escopos para os dropdowns
    const edificacoesList = useMemo(() => {
        const unique = Array.from(new Set(escopos.map((e: any) => e.edificacao))).sort();
        return unique;
    }, [escopos]);

    const empresasList = useMemo(() => {
        const unique = Array.from(new Set(escopos.map((e: any) => e.empresa))).sort();
        return unique;
    }, [escopos]);

    const isNew = !entrega?.id;

    // Calcular próximo número de entrega
    const nextNumeroEntrega = useMemo(() => {
        if (!isNew) return entrega.numeroEntrega;
        const max = allEntregas.reduce((acc: number, curr: any) => Math.max(acc, curr.numeroEntrega || 0), 0);
        return max + 1;
    }, [allEntregas, isNew, entrega]);

    const [formData, setFormData] = useState({
        id: entrega?.id,
        escopoId: entrega?.escopoId || null,
        nomeDocumento: entrega?.nomeDocumento || "",
        tipoDocumento: entrega?.tipoDocumento || "relatorio",
        edificacao: entrega?.edificacao || selectedEdificacao || "",
        disciplina: entrega?.disciplina || "",
        empresaResponsavel: entrega?.empresaResponsavel || "",
        dataPrevista: entrega?.dataPrevista ? dayjs(entrega.dataPrevista).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        dataRecebimento: entrega?.dataRecebimento ? dayjs(entrega.dataRecebimento).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        status: entrega?.status || "RECEBIDO",
        descricao: entrega?.descricao || "",
        numeroEntrega: entrega?.numeroEntrega || nextNumeroEntrega,
        identificadorEntrega: entrega?.identificadorEntrega || "",
        formato: entrega?.formato || "rvt",
        isModelo: entrega?.isModelo ?? (entrega?.tipoDocumento === 'rvt' ? 1 : 0),
        modeloBaseReferencia: entrega?.modeloBaseReferencia || "",
        acoesNecessarias: entrega?.acoesNecessarias || "",
        checkpointBep: entrega?.checkpointBep || JSON.stringify({ geo: false, param: false, naming: false, lod: false, clash: false }),
        manualEntry: {
            edificacao: false,
            disciplina: false,
            empresa: false
        }
    });

    // Atualizar numeroEntrega quando os dados carregarem
    useEffect(() => {
        if (isNew && formData.numeroEntrega === 0 && nextNumeroEntrega > 0) {
            setFormData(prev => ({ ...prev, numeroEntrega: nextNumeroEntrega }));
        }
    }, [nextNumeroEntrega, isNew]);

    const disciplinasList = useMemo(() => {
        if (!formData.edificacao) return [];
        const filtered = escopos.filter((e: any) => e.edificacao === formData.edificacao);
        const unique = Array.from(new Set(filtered.map((e: any) => e.disciplina))).sort();
        return unique;
    }, [escopos, formData.edificacao]);

    // Lógica de Modelo Final / Escopo Automático
    const filteredEscoposForSelection = useMemo(() => {
        if (!formData.edificacao || !formData.disciplina) return [];
        return escopos.filter((e: any) => 
            e.edificacao === formData.edificacao && 
            e.disciplina === formData.disciplina
        );
    }, [escopos, formData.edificacao, formData.disciplina]);

    const handleEscopoSelection = (escopoId: string) => {
        const id = parseInt(escopoId);
        const match = escopos.find((e: any) => e.id === id);
        if (match) {
            setFormData(prev => ({ 
                ...prev, 
                escopoId: id,
                empresaResponsavel: match.empresa,
                modeloBaseReferencia: match.nomeModelo
            }));
        } else {
            setFormData(prev => ({ ...prev, escopoId: null }));
        }
    };

    const handleFormatoChange = (val: string) => {
        let tipo = "relatorio";
        let isModelo = 0;
        
        if (val === "rvt" || val === "ifc") {
            tipo = "rvt";
            isModelo = 1;
        } else if (val === "dwg") {
            tipo = "dwg";
            isModelo = 0;
        } else if (val === "pdf") {
            tipo = "pdf";
            isModelo = 0;
        }

        setFormData(prev => ({ 
            ...prev, 
            formato: val, 
            tipoDocumento: tipo, 
            isModelo 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            // Resolver escopoId se não estiver definido
            let escopoId = formData.escopoId;
            if (!escopoId) {
                const match = escopos.find((e: any) => 
                    e.edificacao === formData.edificacao && 
                    e.disciplina === formData.disciplina &&
                    e.empresa === formData.empresaResponsavel
                );
                if (match) escopoId = match.id;
            }

            await mutation.mutateAsync({ 
                ...formData, 
                escopoId,
                dataRecebimento: formData.dataRecebimento || null 
            });

            onClose();
        } catch (err) { }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-[#940707] p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">{entrega ? 'Editar Entrega' : 'Nova Entrega as-built'}</h2>
                        <p className="text-white/70 text-sm">Informações do documento a acompanhar</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nº Controle</label>
                            <Input type="number" value={formData.numeroEntrega} onChange={e => setFormData({ ...formData, numeroEntrega: parseInt(e.target.value) })} className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Documento / Arquivo *</label>
                            <Input required value={formData.nomeDocumento} onChange={e => setFormData({ ...formData, nomeDocumento: e.target.value })} placeholder="Ex: NEO-23001-AS-BAR-001..." className="rounded-xl border-slate-200" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Formato *</label>
                            <select 
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" 
                                value={formData.formato} 
                                onChange={e => handleFormatoChange(e.target.value)}
                            >
                                <option value="pdf">Relatório (PDF)</option>
                                <option value="dwg">Desenho (DWG)</option>
                                <option value="rvt">Modelo Revit (RVT)</option>
                                <option value="ifc">Modelo BIM (IFC)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Status *</label>
                            <select className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Edificação *</label>
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, manualEntry: { ...prev.manualEntry, edificacao: !prev.manualEntry.edificacao } }))} className="text-[9px] font-black text-[#940707] hover:underline uppercase">
                                    {formData.manualEntry.edificacao ? "Listar" : "Digitar Novo"}
                                </button>
                            </div>
                            {formData.manualEntry.edificacao ? (
                                <Input required value={formData.edificacao} onChange={e => setFormData({ ...formData, edificacao: e.target.value, disciplina: "", modeloBaseReferencia: "" })} placeholder="Nome da Edificação..." className="rounded-xl border-slate-200" />
                            ) : (
                                <select 
                                    required
                                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" 
                                    value={formData.edificacao} 
                                    onChange={e => setFormData({ ...formData, edificacao: e.target.value, disciplina: "", modeloBaseReferencia: "" })}
                                >
                                    <option value="">Selecione...</option>
                                    {edificacoesList.map((edif: any) => (
                                        <option key={edif} value={edif}>{edif}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Pacote / SM</label>
                            <Input value={formData.identificadorEntrega} onChange={e => setFormData({ ...formData, identificadorEntrega: e.target.value })} placeholder="Ex: SM 611" className="rounded-xl border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Disciplina *</label>
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, manualEntry: { ...prev.manualEntry, disciplina: !prev.manualEntry.disciplina } }))} className="text-[9px] font-black text-[#940707] hover:underline uppercase">
                                    {formData.manualEntry.disciplina ? "Listar" : "Digitar Novo"}
                                </button>
                            </div>
                            {formData.manualEntry.disciplina ? (
                                <Input required value={formData.disciplina} onChange={e => setFormData({ ...formData, disciplina: e.target.value, modeloBaseReferencia: "" })} placeholder="Nome da Disciplina..." className="rounded-xl border-slate-200" />
                            ) : (
                                <select 
                                    required
                                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" 
                                    value={formData.disciplina} 
                                    onChange={e => setFormData({ ...formData, disciplina: e.target.value, modeloBaseReferencia: "" })}
                                >
                                    <option value="">Selecione...</option>
                                    {disciplinasList.map((disc: any) => (
                                        <option key={disc} value={disc}>{disc}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Empreiteiro *</label>
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, manualEntry: { ...prev.manualEntry, empresa: !prev.manualEntry.empresa } }))} className="text-[9px] font-black text-[#940707] hover:underline uppercase">
                                    {formData.manualEntry.empresa ? "Listar" : "Digitar Novo"}
                                </button>
                            </div>
                            {formData.manualEntry.empresa ? (
                                <Input required value={formData.empresaResponsavel} onChange={e => setFormData({ ...formData, empresaResponsavel: e.target.value })} placeholder="Nome da Empresa..." className="rounded-xl border-slate-200" />
                            ) : (
                                <select 
                                    required
                                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" 
                                    value={formData.empresaResponsavel} 
                                    onChange={e => setFormData({ ...formData, empresaResponsavel: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {empresasList.map((emp: any) => (
                                        <option key={emp} value={emp}>{emp}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 text-[#940707]">Modelo Final As-Built (Opcional se não houver modelo)</label>
                            <select 
                                className="flex h-10 w-full rounded-xl border-2 border-[#940707]/20 bg-white px-3 py-2 text-sm font-bold text-slate-700 focus:border-[#940707] transition-all" 
                                value={formData.escopoId || ""} 
                                onChange={e => handleEscopoSelection(e.target.value)}
                            >
                                <option value="">NÃO VINCULADO / SEM MODELO</option>
                                {filteredEscoposForSelection.map((esc: any) => (
                                    <option key={esc.id} value={esc.id}>
                                        {esc.nomeModeloFinal || esc.nomeModelo} ({esc.empresa})
                                    </option>
                                ))}
                            </select>
                            {filteredEscoposForSelection.length === 0 && formData.edificacao && formData.disciplina && (
                                <p className="text-[10px] text-slate-400 font-bold mt-1 ml-1 italic">
                                    Nenhum modelo cadastrado na Lista Mestra para esta edificação/disciplina. Você pode salvar como entrega avulsa (DWG/PDF).
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">É um Modelo BIM? *</label>
                            <Input readOnly value={formData.isModelo === 1 ? "Sim" : "Não"} className="rounded-xl border-none bg-slate-50 font-bold text-slate-500" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Modelo Base</label>
                            <Input value={formData.modeloBaseReferencia} onChange={e => setFormData({ ...formData, modeloBaseReferencia: e.target.value })} placeholder="Automático..." className="rounded-xl border-slate-200 bg-blue-50/30" />
                        </div>

                        {entrega && (
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Ações Necessárias / Pós Entrega</label>
                                <Input value={formData.acoesNecessarias} onChange={e => setFormData({ ...formData, acoesNecessarias: e.target.value })} placeholder="Ex: Pedir RVT nativo, revisar níveis..." className="rounded-xl border-slate-200" />
                            </div>
                        )}


                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Data de Entrega *</label>
                            {/* 
                                IMPORTANTE: Alterado de 'dataPrevista' para 'dataRecebimento'.
                                Isso garante que a data que o usuário digita seja a que aparece na 'Data de Entrega' da tabela.
                                Também atualizamos a 'dataPrevista' junto para manter os dois campos em sincronia.
                            */}
                            <Input 
                                type="date" 
                                required 
                                value={formData.dataRecebimento} 
                                onChange={e => setFormData({ 
                                    ...formData, 
                                    dataRecebimento: e.target.value,
                                    dataPrevista: e.target.value // Sincroniza a previsão com o recebimento real
                                })} 
                                className="rounded-xl border-slate-200" 
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Descrição / Observações</label>
                            <Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Notas adicionais..." className="resize-none rounded-xl border-slate-200 min-h-[60px]" />
                        </div>
                        <div className="flex flex-col justify-end gap-2 pb-1">
                            <Button type="submit" disabled={mutation.isPending} className="w-full rounded-xl shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606] text-white">
                                {mutation.isPending ? 'Salvando...' : (entrega ? 'Salvar' : 'Criar Entrega')}
                            </Button>
                            <Button type="button" variant="ghost" onClick={onClose} className="w-full rounded-xl text-slate-400">Cancelar</Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// BATCH DELIVERY FORM MODAL
// ------------------------------------------------------------------
function BatchEntregaForm({ projectId, selectedEdificacao, onClose }: { projectId: string, selectedEdificacao?: string, onClose: () => void }) {
    const utils = trpc.useUtils();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });
    
    const [selectedEmpresa, setSelectedEmpresa] = useState("");
    const [selectedEscopoIds, setSelectedEscopoIds] = useState<number[]>([]);
    const [escopoNames, setEscopoNames] = useState<Record<number, string>>({});
    const [formData, setFormData] = useState({
        nomeDocumento: "",
        tipoDocumento: "rvt",
        dataRecebimento: dayjs().format('YYYY-MM-DD'),
        descricao: "",
        status: "RECEBIDO"
    });

    const empresas = useMemo<string[]>(() => {
        const set = new Set(escopos.map((e: any) => e.empresa));
        return Array.from(set).sort() as string[];
    }, [escopos]);

    const filteredEscopos = useMemo<any[]>(() => {
        return escopos.filter((e: any) => 
            e.empresa === selectedEmpresa && 
            (!selectedEdificacao || e.edificacao === selectedEdificacao)
        );
    }, [escopos, selectedEmpresa, selectedEdificacao]);

    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            onClose();
        },
        onError: (err) => alert("Erro ao salvar: " + err.message)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedEscopoIds.length === 0) {
            alert("Selecione ao menos um modelo.");
            return;
        }
        mutation.mutate({
            ...formData,
            escopoIds: selectedEscopoIds,
            escopoNames: Object.fromEntries(
                Object.entries(escopoNames).map(([k, v]) => [k, v])
            ),
            empresaResponsavel: selectedEmpresa,
            edificacao: selectedEdificacao || "Geral",
            disciplina: "Múltiplas",
            dataPrevista: formData.dataRecebimento // Default to same as receiving
        } as any);
    };

    const toggleEscopo = (id: number, nomePadrao: string) => {
        setSelectedEscopoIds(prev => {
            const isRemoving = prev.includes(id);
            if (isRemoving) {
                return prev.filter(i => i !== id);
            } else {
                // If adding, pre-fill the name if not already set
                if (!escopoNames[id]) {
                    setEscopoNames(curr => ({ ...curr, [id]: nomePadrao }));
                }
                return [...prev, id];
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-[#940707] p-6 text-white shrink-0">
                    <h2 className="text-xl font-bold">Registrar Entrega de Lote</h2>
                    <p className="text-white/70 text-sm">Vincule múltiplos modelos a um mesmo recebimento</p>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Empresa Fornecedora *</label>
                            <select 
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm"
                                value={selectedEmpresa}
                                onChange={e => {
                                    setSelectedEmpresa(e.target.value);
                                    setSelectedEscopoIds([]);
                                }}
                                required
                            >
                                <option value="">Selecione a empresa...</option>
                                {empresas.map((emp: string) => <option key={emp} value={emp}>{emp}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Pasta/Referência da Entrega *</label>
                            <Input 
                                required 
                                value={formData.nomeDocumento} 
                                onChange={e => setFormData({ ...formData, nomeDocumento: e.target.value })} 
                                placeholder="Ex: SM 47 - Modelos Consolidados" 
                                className="rounded-xl border-slate-200" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Data de Recebimento *</label>
                            <Input 
                                type="date" 
                                required 
                                value={formData.dataRecebimento} 
                                onChange={e => setFormData({ ...formData, dataRecebimento: e.target.value })} 
                                className="rounded-xl border-slate-200" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Status Inicial *</label>
                            <select 
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="RECEBIDO">Recebido</option>
                                <option value="EM_REVISAO">Em Revisão</option>
                                <option value="VALIDADO">Validado</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1 flex items-center justify-between">
                            <span>Selecionar Modelos Entregues ({selectedEscopoIds.length})</span>
                            {selectedEmpresa && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-[10px] font-bold text-primary"
                                    onClick={() => {
                                        const ids = filteredEscopos.map((e: any) => e.id);
                                        setSelectedEscopoIds(ids);
                                        const names = { ...escopoNames };
                                        filteredEscopos.forEach((e: any) => {
                                            if (!names[e.id]) names[e.id] = e.nomeModelo;
                                        });
                                        setEscopoNames(names);
                                    }}
                                >
                                    Selecionar Todos
                                </Button>
                            )}
                        </label>
                        
                        <div className="border rounded-2xl overflow-hidden bg-slate-50/50">
                            {!selectedEmpresa ? (
                                <div className="p-10 text-center text-slate-400 italic text-sm">
                                    Selecione uma empresa para listar os modelos do escopo.
                                </div>
                            ) : filteredEscopos.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 italic text-sm">
                                    Nenhum modelo encontrado no escopo desta empresa para {selectedEdificacao || 'esta edificação'}.
                                </div>
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto">
                                    <Table>
                                        <TableBody>
                                            {filteredEscopos.map((esc: any) => (
                                                <TableRow 
                                                    key={esc.id} 
                                                    className={`hover:bg-white cursor-pointer group transition-colors ${selectedEscopoIds.includes(esc.id) ? 'bg-white' : ''}`}
                                                    onClick={() => toggleEscopo(esc.id, esc.nomeModelo)}
                                                >
                                                    <TableCell className="w-10 align-top pt-4">
                                                        <Checkbox checked={selectedEscopoIds.includes(esc.id)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 text-sm">{esc.nomeModelo}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase">{esc.disciplina}</span>
                                                                <span className="text-[10px] text-slate-400">{esc.edificacao}</span>
                                                            </div>

                                                            {selectedEscopoIds.includes(esc.id) && (
                                                                <div className="mt-3 pb-2 animate-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-0.5">Nome do Arquivo Entregue</label>
                                                                    <Input 
                                                                        className="h-8 text-xs rounded-lg border-primary/20 bg-white shadow-sm focus-visible:ring-primary/20"
                                                                        placeholder="Nome específico deste arquivo..."
                                                                        value={escopoNames[esc.id] || ""}
                                                                        onChange={e => setEscopoNames(prev => ({ ...prev, [esc.id]: e.target.value }))}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1">Observações da Entrega</label>
                        <Textarea 
                            value={formData.descricao} 
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })} 
                            placeholder="Ex: Entregue via link Nextcloud, contendo revisões R03 dos modelos citados." 
                            className="resize-none rounded-xl border-slate-200 min-h-[80px]" 
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
                        <Button 
                            type="submit" 
                            disabled={mutation.isPending || !selectedEmpresa || selectedEscopoIds.length === 0} 
                            className="rounded-full px-8 shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606] text-white"
                        >
                            {mutation.isPending ? 'Registrando...' : `Registrar ${selectedEscopoIds.length} Entregas`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
