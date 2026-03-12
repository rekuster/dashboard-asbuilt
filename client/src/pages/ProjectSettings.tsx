import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    ArrowLeft, Save, Loader2, Plus, Trash2, ChevronDown, ChevronRight,
    Building2, Layers, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProjectSettings() {
    const { id } = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const { user } = useAuth();

    const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: id! });
    const utils = trpc.useUtils();

    // General info state
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [client, setClient] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocationVal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('ativo');
    const [saving, setSaving] = useState(false);

    const updateProject = trpc.projects.update.useMutation({
        onSuccess: () => {
            toast.success('Projeto atualizado!');
            utils.projects.getById.invalidate({ id: id! });
            utils.projects.list.invalidate();
            setSaving(false);
        },
        onError: (err) => {
            toast.error('Erro ao salvar', { description: err.message });
            setSaving(false);
        },
    });

    useEffect(() => {
        if (project) {
            setCode(project.code);
            setName(project.name);
            setClient(project.client || '');
            setDescription(project.description || '');
            setLocationVal(project.location || '');
            setStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '');
            setEndDate(project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '');
            setStatus(project.status);
        }
    }, [project]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando configurações...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Projeto não encontrado.</p>
                <Button variant="outline" onClick={() => setLocation('/')}>Voltar</Button>
            </div>
        );
    }

    const inputClass = `w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        transition-all placeholder:text-muted-foreground`;

    const handleSaveGeneral = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        updateProject.mutate({
            id: id!,
            code: code.trim(),
            name: name.trim(),
            client: client.trim() || undefined,
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            status,
        });
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setLocation(`/project/${id}`)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao Dashboard
                    </Button>
                    <div className="w-px h-8 bg-slate-200" />
                    <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{project.code}</p>
                        <h1 className="text-sm font-semibold">{project.name} — Configurações</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="bg-white border p-1 h-11 shadow-sm">
                        <TabsTrigger value="general" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Building2 className="w-4 h-4 mr-2" />
                            Informações Gerais
                        </TabsTrigger>
                        <TabsTrigger value="master" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Layers className="w-4 h-4 mr-2" />
                            Lista Mestra
                        </TabsTrigger>
                    </TabsList>

                    {/* General Info Tab */}
                    <TabsContent value="general">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações do Projeto</CardTitle>
                                <CardDescription>Dados de identificação e configuração geral do projeto.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-2xl">
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider">Código *</label>
                                            <input value={code} onChange={(e) => setCode(e.target.value)} required className={inputClass} />
                                        </div>
                                        <div className="col-span-3 space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider">Nome do Projeto *</label>
                                            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider">Cliente</label>
                                        <input value={client} onChange={(e) => setClient(e.target.value)} className={inputClass} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider">Localização</label>
                                        <input value={location} onChange={(e) => setLocationVal(e.target.value)} className={inputClass} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider">Data de Início</label>
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider">Previsão de Término</label>
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                                                <option value="ativo">Ativo</option>
                                                <option value="concluido">Concluído</option>
                                                <option value="arquivado">Arquivado</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider">Descrição</label>
                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider">Administrador</label>
                                        <input value={user?.email || ''} disabled className={`${inputClass} bg-slate-50 text-muted-foreground`} />
                                    </div>

                                    <div className="pt-4">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Master List Tab */}
                    <TabsContent value="master">
                        <MasterListTab projectId={id!} inputClass={inputClass} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ============================================================================
// Master List Tab — with edit, insert, delete functionality
// ============================================================================
function MasterListTab({ projectId, inputClass }: { projectId: string; inputClass: string }) {
    type SalaEntry = {
        edificacao: string;
        pavimento: string;
        setor: string;
        nome: string;
        numeroSala: string;
    };

    const [masterList, setMasterList] = useState<SalaEntry[]>([]);
    const [newEdificacao, setNewEdificacao] = useState('');
    const [newPavimento, setNewPavimento] = useState('');
    const [newSetor, setNewSetor] = useState('');
    const [newNome, setNewNome] = useState('');
    const [newNumeroSala, setNewNumeroSala] = useState('');
    const [expandedEdif, setExpandedEdif] = useState<Record<string, boolean>>({});
    const [expandedPav, setExpandedPav] = useState<Record<string, boolean>>({});
    const [savingMaster, setSavingMaster] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editNome, setEditNome] = useState('');
    const [editNumero, setEditNumero] = useState('');
    const [editSetor, setEditSetor] = useState('');

    // Insert state
    const [insertingAt, setInsertingAt] = useState<{ edificacao: string; pavimento: string; setor: string; numero: string } | null>(null);
    const [insertNome, setInsertNome] = useState('');

    const utils = trpc.useUtils();
    const invalidateRooms = () => utils.projects.getSalasByProject.invalidate({ projectId });

    // Fetch existing rooms for this project
    const { data: existingRooms, isLoading: loadingRooms } = trpc.projects.getSalasByProject.useQuery({ projectId });

    const saveMasterListMutation = trpc.projects.saveMasterList.useMutation({
        onSuccess: (result) => {
            toast.success(`Lista mestra salva! ${result.created} salas criadas.`);
            setMasterList([]);
            invalidateRooms();
            setSavingMaster(false);
        },
        onError: (err) => {
            toast.error('Erro ao salvar lista mestra', { description: err.message });
            setSavingMaster(false);
        },
    });

    const updateSalaMutation = trpc.projects.updateSalaInProject.useMutation({
        onSuccess: () => {
            toast.success('Sala atualizada!');
            setEditingId(null);
            invalidateRooms();
        },
        onError: (err) => toast.error('Erro ao atualizar', { description: err.message }),
    });

    const deleteSalaMutation = trpc.projects.deleteSalaFromProject.useMutation({
        onSuccess: () => {
            toast.success('Sala excluída!');
            invalidateRooms();
        },
        onError: (err) => toast.error('Erro ao excluir', { description: err.message }),
    });

    const insertSalaMutation = trpc.projects.insertSalaWithRenumber.useMutation({
        onSuccess: (result) => {
            toast.success(`Sala inserida! ${result.shifted} salas renumeradas.`);
            setInsertingAt(null);
            setInsertNome('');
            invalidateRooms();
        },
        onError: (err) => toast.error('Erro ao inserir', { description: err.message }),
    });

    const addSalaToList = () => {
        if (!newEdificacao.trim() || !newPavimento.trim() || !newSetor.trim() || !newNome.trim() || !newNumeroSala.trim()) {
            toast.error('Preencha todos os campos');
            return;
        }
        setMasterList(prev => [...prev, {
            edificacao: newEdificacao.trim(),
            pavimento: newPavimento.trim(),
            setor: newSetor.trim(),
            nome: newNome.trim(),
            numeroSala: newNumeroSala.trim(),
        }]);
        setNewNome('');
        setNewNumeroSala('');
    };

    const removeSalaFromList = (index: number) => {
        setMasterList(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveMasterList = () => {
        if (masterList.length === 0) {
            toast.error('Adicione pelo menos uma sala');
            return;
        }
        setSavingMaster(true);
        saveMasterListMutation.mutate({ projectId, salas: masterList });
    };

    const startEdit = (sala: any) => {
        setEditingId(sala.id);
        setEditNome(sala.nome);
        setEditNumero(sala.numeroSala);
        setEditSetor(sala.setor);
    };

    const saveEdit = () => {
        if (!editingId) return;
        updateSalaMutation.mutate({
            id: editingId,
            nome: editNome.trim(),
            numeroSala: editNumero.trim(),
            setor: editSetor.trim(),
        });
    };

    const handleDelete = (sala: any) => {
        if (confirm(`Excluir a sala "${sala.nome}" (Nº ${sala.numeroSala})?`)) {
            deleteSalaMutation.mutate({ id: sala.id });
        }
    };

    const startInsert = (sala: any) => {
        setInsertingAt({
            edificacao: sala.edificacao,
            pavimento: sala.pavimento,
            setor: sala.setor,
            numero: sala.numeroSala,
        });
        setInsertNome('');
    };

    const confirmInsert = () => {
        if (!insertingAt || !insertNome.trim()) {
            toast.error('Preencha o nome da sala');
            return;
        }
        insertSalaMutation.mutate({
            projectId,
            edificacao: insertingAt.edificacao,
            pavimento: insertingAt.pavimento,
            setor: insertingAt.setor,
            nome: insertNome.trim(),
            numeroSala: insertingAt.numero,
        });
    };

    // Group existing rooms by edificacao → pavimento → setor
    type GroupedRooms = Record<string, Record<string, Record<string, any[]>>>;
    const groupedExisting: GroupedRooms = (existingRooms || []).reduce<GroupedRooms>((acc, sala: any) => {
        const edif = sala.edificacao || 'Sem Edificação';
        const pav = sala.pavimento || 'Sem Pavimento';
        const setor = sala.setor || 'Sem Setor';
        if (!acc[edif]) acc[edif] = {};
        if (!acc[edif][pav]) acc[edif][pav] = {};
        if (!acc[edif][pav][setor]) acc[edif][pav][setor] = [];
        acc[edif][pav][setor].push(sala);
        return acc;
    }, {} as GroupedRooms);

    const totalExisting = existingRooms?.length || 0;

    // Group pending new rooms
    const groupedNew = masterList.reduce((acc, sala) => {
        if (!acc[sala.edificacao]) acc[sala.edificacao] = {};
        if (!acc[sala.edificacao][sala.pavimento]) acc[sala.edificacao][sala.pavimento] = [];
        acc[sala.edificacao][sala.pavimento].push(sala);
        return acc;
    }, {} as Record<string, Record<string, SalaEntry[]>>);

    const compactInput = `px-2 py-1 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30`;

    return (
        <div className="space-y-6">
            {/* Existing Rooms */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Salas Cadastradas
                        {totalExisting > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                ({totalExisting} {totalExisting === 1 ? 'sala' : 'salas'})
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Salas do banco de dados. Use ✏️ para editar, ➕ para inserir acima (renumera toda a edificação), e 🗑️ para excluir.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingRooms ? (
                        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Carregando salas...
                        </div>
                    ) : totalExisting === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="font-medium">Nenhuma sala cadastrada ainda</p>
                            <p className="text-sm">Use o formulário abaixo para adicionar salas ao projeto.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(groupedExisting).sort(([, pavA], [, pavB]) => {
                                const minA = Math.min(...Object.values(pavA).flatMap(s => Object.values(s).flat().map((r: any) => parseInt(r.numeroSala, 10) || 0)));
                                const minB = Math.min(...Object.values(pavB).flatMap(s => Object.values(s).flat().map((r: any) => parseInt(r.numeroSala, 10) || 0)));
                                return minA - minB;
                            }).map(([edif, pavimentos]) => {
                                const edifKey = `existing_${edif}`;
                                const totalInEdif = Object.values(pavimentos).reduce(
                                    (sum, setores) => sum + Object.values(setores).reduce((s, rooms) => s + rooms.length, 0), 0
                                );
                                return (
                                    <div key={edif} className="border rounded-lg overflow-hidden">
                                        <button
                                            className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                            onClick={() => setExpandedEdif(prev => ({ ...prev, [edifKey]: !prev[edifKey] }))}
                                        >
                                            {expandedEdif[edifKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            <Building2 className="w-4 h-4 text-primary" />
                                            <span className="font-semibold text-sm">{edif}</span>
                                            <span className="text-xs text-muted-foreground ml-auto">{totalInEdif} salas</span>
                                        </button>

                                        {expandedEdif[edifKey] && (
                                            <div className="pl-6">
                                                {Object.entries(pavimentos).map(([pav, setores]) => {
                                                    const pavKey = `existing_${edif}_${pav}`;
                                                    const totalInPav = Object.values(setores).reduce((s, rooms) => s + rooms.length, 0);
                                                    return (
                                                        <div key={pav}>
                                                            <button
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors text-left"
                                                                onClick={() => setExpandedPav(prev => ({ ...prev, [pavKey]: !prev[pavKey] }))}
                                                            >
                                                                {expandedPav[pavKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                                <Layers className="w-3 h-3 text-blue-500" />
                                                                <span className="text-sm">{pav}</span>
                                                                <span className="text-xs text-muted-foreground">({totalInPav})</span>
                                                            </button>

                                                            {expandedPav[pavKey] && (
                                                                <div className="pl-8 pb-2">
                                                                    {Object.entries(setores).map(([setor, rooms]) => (
                                                                        <div key={setor}>
                                                                            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                                                <MapPin className="w-3 h-3" />
                                                                                {setor}
                                                                            </div>
                                                                            {rooms.map((sala: any) => {
                                                                                const isEditing = editingId === sala.id;
                                                                                const isInsertTarget = insertingAt?.numero === sala.numeroSala && insertingAt?.edificacao === sala.edificacao && insertingAt?.pavimento === sala.pavimento && insertingAt?.setor === sala.setor;
                                                                                const statusColor = sala.status === 'VERIFICADA' ? 'bg-emerald-100 text-emerald-700' :
                                                                                    sala.status === 'PENDENTE' ? 'bg-slate-100 text-slate-600' :
                                                                                        'bg-amber-100 text-amber-700';

                                                                                return (
                                                                                    <div key={sala.id}>
                                                                                        {/* Insert above row */}
                                                                                        {isInsertTarget && (
                                                                                            <div className="flex items-center gap-2 px-3 py-1.5 ml-4 bg-blue-50 border border-blue-200 rounded mb-1 animate-in fade-in">
                                                                                                <span className="text-xs text-blue-600 font-medium shrink-0">Inserir Nº {insertingAt.numero}:</span>
                                                                                                <input
                                                                                                    value={insertNome}
                                                                                                    onChange={(e) => setInsertNome(e.target.value)}
                                                                                                    placeholder="Nome da nova sala"
                                                                                                    className={`${compactInput} flex-1`}
                                                                                                    autoFocus
                                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') confirmInsert(); if (e.key === 'Escape') setInsertingAt(null); }}
                                                                                                />
                                                                                                <Button size="sm" variant="default" className="h-7 text-xs" onClick={confirmInsert} disabled={insertSalaMutation.isPending}>
                                                                                                    {insertSalaMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Inserir'}
                                                                                                </Button>
                                                                                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setInsertingAt(null)}>✕</Button>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Room row */}
                                                                                        {isEditing ? (
                                                                                            <div className="flex items-center gap-2 px-3 py-1.5 ml-4 bg-amber-50 border border-amber-200 rounded">
                                                                                                <input value={editNumero} onChange={(e) => setEditNumero(e.target.value)} className={`${compactInput} w-14`} title="Nº Sala" />
                                                                                                <input value={editNome} onChange={(e) => setEditNome(e.target.value)} className={`${compactInput} flex-1`} title="Nome"
                                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                                                                                                />
                                                                                                <input value={editSetor} onChange={(e) => setEditSetor(e.target.value)} className={`${compactInput} w-28`} title="Setor" />
                                                                                                <Button size="sm" variant="default" className="h-7 text-xs" onClick={saveEdit} disabled={updateSalaMutation.isPending}>
                                                                                                    {updateSalaMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                                                </Button>
                                                                                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>✕</Button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center justify-between px-3 py-1 hover:bg-slate-50/50 rounded text-sm ml-4 group">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">{sala.numeroSala}</span>
                                                                                                    <span>{sala.nome}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1">
                                                                                                    {/* Actions — visible on hover */}
                                                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mr-2">
                                                                                                        <button onClick={() => startInsert(sala)} className="p-1 rounded hover:bg-blue-100 text-blue-600" title="Inserir sala acima (renumera)">
                                                                                                            <Plus className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                        <button onClick={() => startEdit(sala)} className="p-1 rounded hover:bg-amber-100 text-amber-600" title="Editar sala">
                                                                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                                                                                        </button>
                                                                                                        <button onClick={() => handleDelete(sala)} className="p-1 rounded hover:bg-red-100 text-destructive" title="Excluir sala">
                                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                                                                                                        {sala.status}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add New Rooms */}
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Salas</CardTitle>
                    <CardDescription>
                        Defina a hierarquia: Edificação → Pavimento → Setor → Sala. As salas adicionadas aqui serão criadas no banco de dados do projeto.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edificação</label>
                                <input placeholder="Bloco A" value={newEdificacao} onChange={(e) => setNewEdificacao(e.target.value)} className={inputClass} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pavimento</label>
                                <input placeholder="Térreo" value={newPavimento} onChange={(e) => setNewPavimento(e.target.value)} className={inputClass} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Setor</label>
                                <input placeholder="Ala Norte" value={newSetor} onChange={(e) => setNewSetor(e.target.value)} className={inputClass} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sala / Ambiente</label>
                                <input placeholder="Sala 101" value={newNome} onChange={(e) => setNewNome(e.target.value)} className={inputClass} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nº Sala</label>
                                <div className="flex gap-1">
                                    <input placeholder="101" value={newNumeroSala} onChange={(e) => setNewNumeroSala(e.target.value)}
                                        className={inputClass}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSalaToList(); } }}
                                    />
                                    <Button type="button" size="sm" onClick={addSalaToList} className="shrink-0 h-[38px]">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preview pending list */}
            {masterList.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Prévia da Lista ({masterList.length} novas salas)</CardTitle>
                                <CardDescription>Revise antes de salvar no banco de dados.</CardDescription>
                            </div>
                            <Button onClick={handleSaveMasterList} disabled={savingMaster}>
                                {savingMaster ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Lista Mestra
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(groupedNew).map(([edif, pavimentos]) => (
                                <div key={edif} className="border rounded-lg overflow-hidden">
                                    <button
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
                                        onClick={() => setExpandedEdif(prev => ({ ...prev, [`new_${edif}`]: !prev[`new_${edif}`] }))}
                                    >
                                        {expandedEdif[`new_${edif}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <Building2 className="w-4 h-4 text-emerald-600" />
                                        <span className="font-semibold text-sm">{edif}</span>
                                        <span className="ml-1 text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">NOVA</span>
                                    </button>

                                    {expandedEdif[`new_${edif}`] && (
                                        <div className="pl-6">
                                            {Object.entries(pavimentos).map(([pav, salas]) => (
                                                <div key={pav}>
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors text-left"
                                                        onClick={() => setExpandedPav(prev => ({ ...prev, [`new_${edif}_${pav}`]: !prev[`new_${edif}_${pav}`] }))}
                                                    >
                                                        {expandedPav[`new_${edif}_${pav}`] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        <Layers className="w-3 h-3 text-blue-500" />
                                                        <span className="text-sm">{pav}</span>
                                                        <span className="text-xs text-muted-foreground">({salas.length})</span>
                                                    </button>

                                                    {expandedPav[`new_${edif}_${pav}`] && (
                                                        <div className="pl-8 pb-2">
                                                            {salas.map((sala, i) => {
                                                                const globalIndex = masterList.findIndex(s =>
                                                                    s.edificacao === sala.edificacao &&
                                                                    s.pavimento === sala.pavimento &&
                                                                    s.setor === sala.setor &&
                                                                    s.nome === sala.nome &&
                                                                    s.numeroSala === sala.numeroSala
                                                                );
                                                                return (
                                                                    <div key={i} className="flex items-center justify-between px-3 py-1 hover:bg-red-50/50 group rounded text-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <MapPin className="w-3 h-3 text-muted-foreground" />
                                                                            <span>{sala.nome}</span>
                                                                            <span className="text-xs text-muted-foreground">({sala.setor} • Nº {sala.numeroSala})</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => removeSalaFromList(globalIndex)}
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

