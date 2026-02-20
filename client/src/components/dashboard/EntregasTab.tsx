import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
    PieChart,
    Check
} from "lucide-react";
import dayjs from "dayjs";
import KPICard from "./KPICard";

const STATUS_LABELS: Record<string, { label: string, color: string, icon: any }> = {
    'AGUARDANDO': { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    'RECEBIDO': { label: 'Recebido', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    'EM_REVISAO': { label: 'Em Revisão', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Search },
    'VALIDADO': { label: 'Validado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'REJEITADO': { label: 'Rejeitado', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

const DOC_TYPES: Record<string, string> = {
    'relatorio': 'Relatório',
    'dwg': 'DWG',
    'rvt': 'Revit (RVT)'
};

export default function EntregasTab({ selectedEdificacao }: { selectedEdificacao?: string }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<any>(null);
    const [viewingDetail, setViewingDetail] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("list");

    const utils = trpc.useUtils();
    const { data: entregas = [], isLoading } = trpc.dashboard.getEntregas.useQuery();
    const { data: stats } = trpc.dashboard.getEntregasStats.useQuery({ edificacao: selectedEdificacao });

    const deleteMutation = trpc.dashboard.deleteEntrega.useMutation({
        onSuccess: () => utils.dashboard.getEntregas.invalidate()
    });

    const filteredEntregas = entregas.filter((e: any) => {
        const matchesSearch = e.nomeDocumento.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.empresaResponsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.disciplina.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEdif = !selectedEdificacao || e.edificacao === selectedEdificacao;
        return matchesSearch && matchesEdif;
    });

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

    if (viewingDetail) {
        return (
            <EntregaDetailView
                entrega={viewingDetail}
                onBack={() => setViewingDetail(null)}
                onUpdate={() => {
                    utils.dashboard.getEntregas.invalidate();
                    utils.dashboard.getEntregasStats.invalidate();
                }}
                onEdit={() => handleEdit(viewingDetail)}
                onDelete={() => handleDelete(viewingDetail.id)}
            />
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <KPICard title="Total Previsto" value={stats?.total || 0} subtitle="Documentos mapeados" />
                <KPICard title="Aguardando" value={stats?.aguardando || 0} subtitle="Ainda não recebidos" className="border-amber-200 bg-amber-50/50" />
                <KPICard title="Recebidos" value={stats?.recebidos || 0} subtitle="Aguardando revisão" className="border-blue-200 bg-blue-50/50" />
                <KPICard title="Validados" value={stats?.validados || 0} subtitle="Aprovados final" className="border-emerald-200 bg-emerald-50/50" />
                <KPICard title="Rejeitados" value={stats?.rejeitados || 0} subtitle="Necessitam correção" className="border-rose-200 bg-rose-50/50" />
                <KPICard title="Atrasados" value={stats?.atrasados || 0} subtitle="Prazo expirado" className="border-rose-100 bg-rose-50/30 text-rose-600" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-md bg-slate-100 p-1 rounded-xl mb-6">
                    <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                        <FileText className="w-4 h-4 mr-2" />
                        Lista de Entregas
                    </TabsTrigger>
                    <TabsTrigger value="scope" className="rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                        <Layers className="w-4 h-4 mr-2" />
                        Gestão de Escopo
                    </TabsTrigger>
                </TabsList>

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
                                <Button
                                    className="rounded-full gap-2 shadow-lg shadow-primary/20"
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
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="w-[300px] text-slate-500 font-bold uppercase text-[10px] tracking-wider">Documento</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Empresa</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Disciplina</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Prazo</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                                        <TableHead className="text-right text-slate-500 font-bold uppercase text-[10px] tracking-wider">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">Carregando entregas...</TableCell>
                                        </TableRow>
                                    ) : filteredEntregas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">Nenhuma entrega encontrada.</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredEntregas.map((entrega: any) => {
                                            const statusInfo = STATUS_LABELS[entrega.status] || STATUS_LABELS['AGUARDANDO'];
                                            const StatusIcon = statusInfo.icon;
                                            const isAtrasado = entrega.status === 'AGUARDANDO' && dayjs(entrega.dataPrevista).isBefore(dayjs());

                                            return (
                                                <TableRow
                                                    key={entrega.id}
                                                    className="hover:bg-slate-50/50 transition-colors border-slate-100 group cursor-pointer"
                                                    onClick={() => handleViewDetail(entrega)}
                                                >
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-700">{entrega.nomeDocumento}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{DOC_TYPES[entrega.tipoDocumento] || entrega.tipoDocumento}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600 font-medium">{entrega.empresaResponsavel}</TableCell>
                                                    <TableCell className="text-sm text-slate-600 font-medium">{entrega.disciplina}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-semibold ${isAtrasado ? 'text-rose-500' : 'text-slate-700'}`}>
                                                                {dayjs(entrega.dataPrevista).format('DD/MM/YYYY')}
                                                            </span>
                                                            {isAtrasado && <span className="text-[9px] text-rose-400 font-bold uppercase">Atrasado</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${statusInfo.color}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {statusInfo.label}
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
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="scope">
                    <ScopeManagementView entregas={entregas} selectedEdificacao={selectedEdificacao} />
                </TabsContent>
            </Tabs>

            {isFormOpen && (
                <EntregaForm
                    onClose={() => setIsFormOpen(false)}
                    entrega={editingEntrega}
                    selectedEdificacao={selectedEdificacao}
                />
            )}
        </div>
    );
}

// ------------------------------------------------------------------
// SCOPE MANAGEMENT VIEW
// ------------------------------------------------------------------
function ScopeManagementView({ entregas, selectedEdificacao }: { entregas: any[], selectedEdificacao?: string }) {
    const scopeData = useMemo(() => {
        const groups: Record<string, any> = {};

        entregas.forEach(e => {
            if (selectedEdificacao && e.edificacao !== selectedEdificacao) return;

            const key = `${e.edificacao || 'Sem Edif.'}|${e.empresaResponsavel}`;
            if (!groups[key]) {
                groups[key] = {
                    edificacao: e.edificacao || 'Sem Edif.',
                    empresa: e.empresaResponsavel,
                    disciplinas: new Set(),
                    total: 0,
                    validados: 0,
                    pendentes: 0
                };
            }

            groups[key].disciplinas.add(e.disciplina);
            groups[key].total++;
            if (e.status === 'VALIDADO') groups[key].validados++;
            if (e.status === 'AGUARDANDO' || e.status === 'REJEITADO') groups[key].pendentes++;
        });

        return Object.values(groups).sort((a, b) => a.edificacao.localeCompare(b.edificacao));
    }, [entregas, selectedEdificacao]);

    return (
        <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Resumo de Escopo por Edificação e Empresa
                </CardTitle>
                <CardDescription>Acompanhamento quantitativo das entregas esperadas</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-bold uppercase text-[10px]">Edificação</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Empresa Responsável</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Disciplinas</TableHead>
                                <TableHead className="text-center font-bold uppercase text-[10px]">Expectativa (Qtd)</TableHead>
                                <TableHead className="text-center font-bold uppercase text-[10px]">Validados</TableHead>
                                <TableHead className="text-center font-bold uppercase text-[10px]">Pendente</TableHead>
                                <TableHead className="text-center font-bold uppercase text-[10px]">Progresso</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scopeData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 italic">Nenhum dado de escopo mapeado.</TableCell>
                                </TableRow>
                            ) : (
                                scopeData.map((group, idx) => {
                                    const progress = Math.round((group.validados / group.total) * 100);
                                    return (
                                        <TableRow key={idx} className="hover:bg-slate-50/50">
                                            <TableCell className="font-bold text-slate-700">{group.edificacao}</TableCell>
                                            <TableCell className="font-medium text-slate-600">{group.empresa}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.from(group.disciplinas).map((d: any, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">{d}</span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold">{group.total}</TableCell>
                                            <TableCell className="text-center text-emerald-600 font-bold">{group.validados}</TableCell>
                                            <TableCell className="text-center text-amber-600 font-bold">{group.pendentes}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">{progress}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-6 p-4 bg-[#940707]/5 border border-[#940707]/10 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-[#940707] rounded-lg text-white">
                        <Check className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[#940707]">Dica de Uso</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Para documentar o escopo esperado de uma construtora, crie novas entregas com o status <b>Aguardando</b>.
                            Elas aparecerão aqui como "Expectativa" e serão contabilizadas conforme forem sendo validadas.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ------------------------------------------------------------------
// DETAIL VIEW COMPONENT
// ------------------------------------------------------------------
function EntregaDetailView({ entrega, onBack, onUpdate, onEdit, onDelete }: any) {
    const utils = trpc.useUtils();
    const [status, setStatus] = useState(entrega.status);
    const [comentario, setComentario] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: historico = [] } = trpc.dashboard.getHistoricoEntrega.useQuery({ id: entrega.id });

    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate();
            utils.dashboard.getEntregasStats.invalidate();
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

    const handleUpdateStatus = () => {
        setIsUpdating(true);
        mutation.mutate({
            ...entrega,
            dataPrevista: new Date(entrega.dataPrevista),
            status,
            comentario: comentario || undefined
        });
    };

    const handleSendComment = () => {
        if (!comentario.trim()) return;
        setIsUpdating(true);
        mutation.mutate({
            ...entrega,
            dataPrevista: new Date(entrega.dataPrevista),
            status: status,
            comentario: comentario
        });
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Building2 className="w-3 h-3" /> Edificação</span>
                                <p className="font-semibold text-slate-700">{entrega.edificacao}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Layers className="w-3 h-3" /> Disciplina</span>
                                <p className="font-semibold text-slate-700">{entrega.disciplina}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Briefcase className="w-3 h-3" /> Empreiteiro</span>
                                <p className="font-semibold text-slate-700">{entrega.empresaResponsavel}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Prevista</span>
                                <p className="font-semibold text-slate-700">{dayjs(entrega.dataPrevista).format('DD/MM/YYYY')}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100 space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Descrição / Notas</span>
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">{entrega.descricao || "Nenhuma descrição fornecida."}</p>
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
function EntregaForm({ onClose, entrega, selectedEdificacao }: any) {
    const utils = trpc.useUtils();
    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate();
            utils.dashboard.getEntregasStats.invalidate();
            onClose();
        },
        onError: (error) => alert("Erro ao salvar: " + error.message)
    });

    const [formData, setFormData] = useState({
        id: entrega?.id,
        nomeDocumento: entrega?.nomeDocumento || "",
        tipoDocumento: entrega?.tipoDocumento || "relatorio",
        edificacao: entrega?.edificacao || selectedEdificacao || "",
        disciplina: entrega?.disciplina || "",
        empresaResponsavel: entrega?.empresaResponsavel || "",
        dataPrevista: entrega?.dataPrevista ? dayjs(entrega.dataPrevista).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        dataRecebimento: entrega?.dataRecebimento ? dayjs(entrega.dataRecebimento).format('YYYY-MM-DD') : "",
        status: entrega?.status || "AGUARDANDO",
        descricao: entrega?.descricao || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ ...formData, dataRecebimento: formData.dataRecebimento || null });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-[#940707] p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">{entrega ? 'Editar Entrega' : 'Nova Entrega as-built'}</h2>
                        <p className="text-white/70 text-sm">Informações do documento a acompanhar</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Documento *</label>
                            <Input required value={formData.nomeDocumento} onChange={e => setFormData({ ...formData, nomeDocumento: e.target.value })} placeholder="Ex: Planta de execução Nível 1" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Tipo *</label>
                            <select className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm" value={formData.tipoDocumento} onChange={e => setFormData({ ...formData, tipoDocumento: e.target.value })}>
                                <option value="relatorio">Relatório</option>
                                <option value="dwg">DWG</option>
                                <option value="rvt">Revit (RVT)</option>
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
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Edificação</label>
                            <Input value={formData.edificacao} onChange={e => setFormData({ ...formData, edificacao: e.target.value })} placeholder="Ex: Bloco A" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Disciplina</label>
                            <Input value={formData.disciplina} onChange={e => setFormData({ ...formData, disciplina: e.target.value })} placeholder="Ex: Arquitetura" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Empreiteiro *</label>
                            <Input required value={formData.empresaResponsavel} onChange={e => setFormData({ ...formData, empresaResponsavel: e.target.value })} placeholder="Ex: Empresa ABC" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Data Prevista *</label>
                            <Input type="date" required value={formData.dataPrevista} onChange={e => setFormData({ ...formData, dataPrevista: e.target.value })} className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Descrição</label>
                            <Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Notas..." className="resize-none rounded-xl border-slate-200 min-h-[100px]" />
                        </div>
                    </div>
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
                        <Button type="submit" disabled={mutation.isPending} className="rounded-full px-8 shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606] text-white">
                            {mutation.isPending ? 'Salvando...' : (entrega ? 'Salvar Alterações' : 'Criar Entrega')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
