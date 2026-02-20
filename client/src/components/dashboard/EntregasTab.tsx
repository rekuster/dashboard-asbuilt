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
// SCOPE MANAGEMENT VIEW (v2) — LISTA MESTRA + TIMELINE + VERIFICAÇÃO
// ------------------------------------------------------------------
function ScopeManagementView({ entregas, selectedEdificacao }: { entregas: any[], selectedEdificacao?: string }) {
    const [selectedEscopo, setSelectedEscopo] = useState<any>(null);
    const [isEscopoFormOpen, setIsEscopoFormOpen] = useState(false);
    const [editingEscopo, setEditingEscopo] = useState<any>(null);

    const { data: escopos = [], isLoading: loadingEscopos } = trpc.dashboard.getEscopos.useQuery();
    const utils = trpc.useUtils();
    const deleteMutation = trpc.dashboard.deleteEscopo.useMutation({
        onSuccess: () => utils.dashboard.getEscopos.invalidate()
    });

    const filteredEscopos = escopos.filter((e: any) =>
        !selectedEdificacao || e.edificacao === selectedEdificacao
    );

    // Count entregas per escopo
    const entregasPerEscopo = useMemo(() => {
        const counts: Record<number, { total: number, validados: number, rejeitados: number, conformes: number, naoConformes: number }> = {};
        entregas.forEach((e: any) => {
            if (e.escopoId) {
                if (!counts[e.escopoId]) counts[e.escopoId] = { total: 0, validados: 0, rejeitados: 0, conformes: 0, naoConformes: 0 };
                counts[e.escopoId].total++;
                if (e.status === 'VALIDADO') counts[e.escopoId].validados++;
                if (e.status === 'REJEITADO') counts[e.escopoId].rejeitados++;
                if (e.resultado === 'CONFORME') counts[e.escopoId].conformes++;
                if (e.resultado === 'NAO_CONFORME') counts[e.escopoId].naoConformes++;
            }
        });
        return counts;
    }, [entregas]);

    if (selectedEscopo) {
        return (
            <TimelineParciais
                escopo={selectedEscopo}
                onBack={() => setSelectedEscopo(null)}
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
                    <Button
                        className="rounded-full gap-2 shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606]"
                        onClick={() => { setEditingEscopo(null); setIsEscopoFormOpen(true); }}
                    >
                        <Plus className="w-4 h-4" />
                        Novo Item de Escopo
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">Empresa</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">Disciplina</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">Edificação</TableHead>
                                    <TableHead className="font-bold uppercase text-[10px] tracking-wider">Modelo Base</TableHead>
                                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-wider">Parciais</TableHead>
                                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-wider">Verificados</TableHead>
                                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-wider">Progresso</TableHead>
                                    <TableHead className="text-right font-bold uppercase text-[10px] tracking-wider">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingEscopos ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10 text-slate-400 italic">Carregando...</TableCell>
                                    </TableRow>
                                ) : filteredEscopos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10 text-slate-400 italic">
                                            Nenhum item de escopo cadastrado. Clique em "Novo Item de Escopo" para começar.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEscopos.map((esc: any) => {
                                    const counts = entregasPerEscopo[esc.id] || { total: 0, validados: 0, conformes: 0 };
                                    const progress = counts.total > 0 ? Math.round((counts.validados / counts.total) * 100) : 0;
                                    return (
                                        <TableRow key={esc.id} className="hover:bg-slate-50/50 cursor-pointer group" onClick={() => setSelectedEscopo(esc)}>
                                            <TableCell className="font-bold text-slate-700">{esc.empresa}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{esc.disciplina}</span>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-600">{esc.edificacao}</TableCell>
                                            <TableCell className="text-sm text-slate-500">{esc.nomeModelo}</TableCell>
                                            <TableCell className="text-center font-bold">{counts.total}</TableCell>
                                            <TableCell className="text-center font-bold text-emerald-600">{counts.validados}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">{progress}%</span>
                                                </div>
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
                </CardContent>
            </Card>

            {isEscopoFormOpen && (
                <EscopoForm
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
function EscopoForm({ escopo, selectedEdificacao, onClose }: { escopo?: any, selectedEdificacao?: string, onClose: () => void }) {
    const utils = trpc.useUtils();
    const mutation = trpc.dashboard.upsertEscopo.useMutation({
        onSuccess: () => {
            utils.dashboard.getEscopos.invalidate();
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
        descricao: escopo?.descricao || "",
        periodicidadeDias: escopo?.periodicidadeDias || 15,
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
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Periodicidade (dias)</label>
                            <Input type="number" value={formData.periodicidadeDias} onChange={e => setFormData({ ...formData, periodicidadeDias: parseInt(e.target.value) || 15 })} className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nome do Modelo Base *</label>
                            <Input required value={formData.nomeModelo} onChange={e => setFormData({ ...formData, nomeModelo: e.target.value })} placeholder="Ex: Hidro_BlocoA.rvt" className="rounded-xl border-slate-200" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Descrição</label>
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
function TimelineParciais({ escopo, onBack }: { escopo: any, onBack: () => void }) {
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
                                <span className="text-sm text-slate-400">•</span>
                                <span className="text-sm text-slate-400">A cada {escopo.periodicidadeDias} dias</span>
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
                    <Button
                        className="rounded-full gap-2 bg-[#940707] hover:bg-[#7a0606] text-white"
                        size="sm"
                        onClick={() => setIsParcialFormOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Registrar Parcial
                    </Button>
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
                                    <div key={parcial.id} className="border rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
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
