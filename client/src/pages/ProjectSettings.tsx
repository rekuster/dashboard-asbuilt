import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    ArrowLeft, Save, Loader2, Plus, Trash2, ChevronDown, ChevronRight,
    Building2, Layers, MapPin, Cpu, Sparkles, Users, ShieldAlert,
    ShieldCheck, Check, Pencil, Search, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useProjectRole } from '@/hooks/useProjectRole';
import MembersTab from '@/components/dashboard/MembersTab';

export default function ProjectSettings() {
    const { id } = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const { user } = useAuth();

    const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: id! });
    const { isAdmin, isLoading: roleLoading } = useProjectRole(id);
    const utils = trpc.useUtils();

    // Tab navigation state: 'general-rooms' | 'disciplines' | 'members'
    const [activeSubTab, setActiveSubTab] = useState<'general-rooms' | 'disciplines' | 'members'>('general-rooms');

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
            toast.success('Dados do projeto atualizados!');
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

    if (isLoading || roleLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
                <Loader2 className="animate-spin w-8 h-8 text-[#9C1915]" />
                <p className="text-xs text-slate-500 font-medium animate-pulse">Carregando configurações...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <p className="text-slate-500 text-sm">Projeto não encontrado.</p>
                <Button variant="outline" onClick={() => setLocation('/')}>Voltar ao Início</Button>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 max-w-md mx-auto text-center px-4">
                <ShieldAlert className="w-14 h-14 text-[#9C1915]" />
                <h1 className="text-lg font-bold text-slate-900">Acesso Restrito</h1>
                <p className="text-xs text-slate-500 leading-relaxed">Você não possui permissões de Administrador para gerenciar as configurações deste projeto.</p>
                <Button variant="outline" onClick={() => setLocation(`/project/${id}`)} className="mt-2 text-xs">
                    Voltar ao Dashboard
                </Button>
            </div>
        );
    }

    const inputClass = `w-full px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs
                        focus:outline-none focus:ring-1 focus:ring-[#9C1915] focus:border-[#9C1915]
                        transition-all placeholder:text-slate-400 font-medium text-slate-800`;

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
        <div className="w-full p-4 md:p-6 min-h-[calc(100vh-3.5rem)] font-sans">
            <div className="flex flex-col md:flex-row gap-5 items-start">
                
                {/* SUB-SIDEBAR DE CONFIGURAÇÕES (LATERAL ESQUERDA) */}
                <aside className="w-full md:w-56 shrink-0 bg-white border border-slate-200 rounded-xl p-2 shadow-xs space-y-1">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Ajustes do Projeto
                    </div>

                    <button
                        onClick={() => setActiveSubTab('general-rooms')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                            activeSubTab === 'general-rooms'
                                ? 'bg-[#9C1915] text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span>Geral & Salas</span>
                    </button>

                    <button
                        onClick={() => setActiveSubTab('disciplines')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                            activeSubTab === 'disciplines'
                                ? 'bg-[#9C1915] text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Disciplinas</span>
                    </button>

                    <button
                        onClick={() => setActiveSubTab('members')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left ${
                            activeSubTab === 'members'
                                ? 'bg-[#9C1915] text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Membros</span>
                    </button>
                </aside>

                {/* CONTEÚDO PRINCIPAL (OCUPA 100% DO ESPAÇO RESTANTE) */}
                <main className="flex-1 w-full min-w-0">
                    {/* 1. GERAL & SALAS */}
                    {activeSubTab === 'general-rooms' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-in fade-in duration-150">
                            {/* Coluna Esquerda: Dados Gerais do Projeto */}
                            <div className="lg:col-span-4 space-y-4">
                                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                                    <CardHeader className="p-3.5 bg-slate-50 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-[#9C1915]" />
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                Dados do Projeto
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3.5">
                                        <form onSubmit={handleSaveGeneral} className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Código *</label>
                                                    <input value={code} onChange={(e) => setCode(e.target.value)} required className={inputClass} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Status</label>
                                                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                                                        <option value="ativo">Ativo</option>
                                                        <option value="concluido">Concluído</option>
                                                        <option value="arquivado">Arquivado</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-600">Nome do Projeto *</label>
                                                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-600">Cliente</label>
                                                <input value={client} onChange={(e) => setClient(e.target.value)} className={inputClass} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Início</label>
                                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-600">Previsão Término</label>
                                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-600">Descrição</label>
                                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                                            </div>

                                            <Button type="submit" disabled={saving} className="w-full bg-[#9C1915] hover:bg-[#7D1411] text-white font-bold text-xs h-7.5 shadow-xs">
                                                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                                Salvar Dados
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Coluna Direita: Lista de Salas e Adição */}
                            <div className="lg:col-span-8 space-y-4">
                                <RoomsListTab projectId={id!} inputClass={inputClass} />
                            </div>
                        </div>
                    )}

                    {/* 2. DISCIPLINAS */}
                    {activeSubTab === 'disciplines' && (
                        <div className="animate-in fade-in duration-150">
                            <DisciplinesConfigTab projectId={id!} inputClass={inputClass} />
                        </div>
                    )}

                    {/* 3. MEMBROS */}
                    {activeSubTab === 'members' && (
                        <div className="animate-in fade-in duration-150">
                            <MembersTab projectId={id!} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// ============================================================================
// Disciplinas Tab — Relação de Disciplinas & Responsáveis As-Built
// ============================================================================
function DisciplinesConfigTab({ projectId, inputClass }: { projectId: string; inputClass: string }) {
    const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
    const utils = trpc.useUtils();

    type DisciplineEntry = {
        sigla: string;
        nome: string;
        responsavel: string;
    };

    const [disciplines, setDisciplines] = useState<DisciplineEntry[]>([]);
    const [newDisc, setNewDisc] = useState('');
    const [newNome, setNewNome] = useState('');
    const [newResp, setNewResp] = useState('');

    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editSigla, setEditSigla] = useState('');
    const [editNome, setEditNome] = useState('');
    const [editResp, setEditResp] = useState('');

    const [companies, setCompanies] = useState<string[]>([]);
    const [newCompany, setNewCompany] = useState('');
    const [saving, setSaving] = useState(false);

    const updateProject = trpc.projects.update.useMutation({
        onSuccess: () => {
            toast.success('Relação de disciplinas e responsáveis salva com sucesso!');
            utils.projects.getById.invalidate({ id: projectId });
            utils.dashboard.getApontamentos.invalidate({ projectId });
            setSaving(false);
        },
        onError: (err) => {
            toast.error('Erro ao salvar configurações', { description: err.message });
            setSaving(false);
        }
    });

    useEffect(() => {
        if (project?.disciplinesConfig) {
            try {
                const parsed = JSON.parse(project.disciplinesConfig);
                const mapped = parsed.map((item: any) => ({
                    sigla: (item.sigla || item.disciplina || "").toUpperCase(),
                    nome: item.nome || item.sigla || item.disciplina || "",
                    responsavel: item.responsavel || ""
                }));
                setDisciplines(mapped);
            } catch (e) {
                setDisciplines([]);
            }
        } else {
            handleFillDefaults();
        }

        if (project?.companiesConfig) {
            try {
                const loadedCompanies = JSON.parse(project.companiesConfig);
                setCompanies(loadedCompanies);
                if (loadedCompanies.length > 0 && !newResp) {
                    setNewResp(loadedCompanies[0]);
                }
            } catch (e) {
                const defaultList = ["Thá", "Ocle", "Stecla", "Instaladora"];
                setCompanies(defaultList);
                setNewResp(defaultList[0]);
            }
        } else {
            const defaultList = ["Thá", "Ocle", "Stecla", "Instaladora"];
            setCompanies(defaultList);
            setNewResp(defaultList[0]);
        }
    }, [project]);

    useEffect(() => {
        if (companies.length > 0 && !companies.includes(newResp)) {
            setNewResp(companies[0]);
        }
    }, [companies, newResp]);

    const handleAddCompany = () => {
        const cleanName = newCompany.trim();
        if (!cleanName) {
            toast.error('Informe o nome da empresa.');
            return;
        }
        if (companies.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
            toast.error('Esta empresa já está cadastrada.');
            return;
        }
        setCompanies(prev => [...prev, cleanName]);
        setNewCompany('');
        if (!newResp) setNewResp(cleanName);
        toast.success(`Empresa "${cleanName}" adicionada.`);
    };

    const handleRemoveCompany = (company: string) => {
        if (disciplines.some(d => d.responsavel.toLowerCase() === company.toLowerCase())) {
            toast.error(`Não é possível excluir "${company}" pois ela está vinculada a disciplinas cadastradas!`);
            return;
        }
        setCompanies(prev => prev.filter(c => c !== company));
        toast.info(`Empresa "${company}" removida.`);
    };

    const handleAddDiscipline = () => {
        const discUpper = newDisc.trim().toUpperCase();
        const nomeClean = newNome.trim();
        if (!discUpper) {
            toast.error('Informe a sigla da disciplina (ex: ARQ).');
            return;
        }
        if (!nomeClean) {
            toast.error('Informe o nome completo da disciplina (ex: Arquitetura).');
            return;
        }
        if (!newResp) {
            toast.error('Selecione uma empresa responsável.');
            return;
        }
        if (disciplines.some(d => d.sigla.toUpperCase() === discUpper)) {
            toast.error(`A sigla ${discUpper} já está cadastrada.`);
            return;
        }
        setDisciplines(prev => [...prev, { sigla: discUpper, nome: nomeClean, responsavel: newResp }]);
        setNewDisc('');
        setNewNome('');
        toast.success(`Disciplina ${discUpper} vinculada.`);
    };

    const handleRemoveDiscipline = (index: number) => {
        setDisciplines(prev => prev.filter((_, i) => i !== index));
    };

    const startEditDiscipline = (idx: number, item: DisciplineEntry) => {
        setEditingIdx(idx);
        setEditSigla(item.sigla);
        setEditNome(item.nome);
        setEditResp(item.responsavel);
    };

    const saveEditDiscipline = (idx: number) => {
        const cleanSigla = editSigla.trim().toUpperCase();
        const cleanNome = editNome.trim();
        if (!cleanSigla || !cleanNome) {
            toast.error('Sigla e nome não podem ser vazios.');
            return;
        }
        if (disciplines.some((d, i) => i !== idx && d.sigla.toUpperCase() === cleanSigla)) {
            toast.error('Esta sigla já está em uso.');
            return;
        }
        setDisciplines(prev => prev.map((item, i) => i === idx ? { sigla: cleanSigla, nome: cleanNome, responsavel: editResp } : item));
        setEditingIdx(null);
        toast.success('Disciplina editada.');
    };

    const handleFillDefaults = () => {
        const defaultStecla = [
            { sigla: 'ELE', nome: 'Instalações Elétricas', responsavel: 'Ocle' },
            { sigla: 'CLI', nome: 'Climatização', responsavel: 'Ocle' },
            { sigla: 'PCI', nome: 'Proteção Contra Incêndio (PCI)', responsavel: 'Ocle' },
            { sigla: 'SDAI', nome: 'Detecção e Alarme (SDAI)', responsavel: 'Ocle' },
            { sigla: 'LOG', nome: 'CFTV e Lógica', responsavel: 'Ocle' },
            { sigla: 'UTI', nome: 'Utilidades', responsavel: 'Ocle' },
            { sigla: 'ELEMT', nome: 'Barramento e Média Tensão', responsavel: 'Ocle' },
            { sigla: 'SPDA', nome: 'Para-raios (SPDA)', responsavel: 'Ocle' },
            { sigla: 'HID', nome: 'Instalações Hidrossanitárias', responsavel: 'Thá' },
            { sigla: 'EST', nome: 'Estrutura de Concreto', responsavel: 'Thá' },
            { sigla: 'ARQ', nome: 'Arquitetura', responsavel: 'Thá' },
            { sigla: 'MET', nome: 'Estrutura Metálica', responsavel: 'Thá' },
            { sigla: 'FORRO', nome: 'Forro', responsavel: 'Stecla' }
        ];

        setCompanies(prev => {
            const merged = [...prev];
            ["Thá", "Ocle", "Stecla", "Instaladora"].forEach(c => {
                if (!merged.some(m => m.toLowerCase() === c.toLowerCase())) {
                    merged.push(c);
                }
            });
            return merged;
        });

        setDisciplines(defaultStecla);
        toast.info('Disciplinas padrão Stecla carregadas!');
    };

    const handleSave = () => {
        setSaving(true);
        updateProject.mutate({
            id: projectId,
            disciplinesConfig: JSON.stringify(disciplines),
            companiesConfig: JSON.stringify(companies)
        });
    };

    return (
        <div className="space-y-4">
            <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                <CardHeader className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#9C1915]" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Relação de Disciplinas & Responsáveis ({disciplines.length})
                        </CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleFillDefaults} 
                            className="h-7.5 px-2.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Padrão Stecla
                        </Button>

                        <Button 
                            onClick={handleSave} 
                            disabled={saving} 
                            size="sm" 
                            className="h-7.5 px-3 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-xs"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Salvar Disciplinas
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Coluna 1: Empresas Parceiras */}
                        <div className="space-y-3 lg:border-r lg:pr-4 border-slate-100">
                            <div>
                                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">Empresas Parceiras</h3>
                            </div>

                            <div className="flex gap-1.5">
                                <input 
                                    placeholder="Ex: Thá, Ocle" 
                                    value={newCompany} 
                                    onChange={(e) => setNewCompany(e.target.value)} 
                                    className={`${inputClass} h-7.5 text-xs`}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompany(); } }}
                                />
                                <Button type="button" size="sm" onClick={handleAddCompany} className="h-7.5 px-2 bg-[#9C1915] hover:bg-[#7D1411] text-white shrink-0">
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
                                    {companies.map((c, idx) => (
                                        <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50/80">
                                            <span className="font-semibold text-slate-800">{c}</span>
                                            <button 
                                                onClick={() => handleRemoveCompany(c)} 
                                                className="text-slate-400 hover:text-[#9C1915] p-0.5 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Tabela de Disciplinas */}
                        <div className="lg:col-span-3 space-y-3">
                            {/* Formulário de Adição de Disciplina */}
                            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex flex-wrap items-end gap-2">
                                <div className="space-y-0.5 w-[80px]">
                                    <label className="text-[9px] font-bold uppercase text-slate-600">Sigla *</label>
                                    <input 
                                        placeholder="Ex: ELE" 
                                        value={newDisc} 
                                        onChange={(e) => setNewDisc(e.target.value)} 
                                        className={`${inputClass} h-7.5`}
                                    />
                                </div>
                                <div className="space-y-0.5 flex-1 min-w-[180px]">
                                    <label className="text-[9px] font-bold uppercase text-slate-600">Nome da Disciplina *</label>
                                    <input 
                                        placeholder="Ex: Instalações Elétricas" 
                                        value={newNome} 
                                        onChange={(e) => setNewNome(e.target.value)} 
                                        className={`${inputClass} h-7.5`}
                                    />
                                </div>
                                <div className="space-y-0.5 w-[120px]">
                                    <label className="text-[9px] font-bold uppercase text-slate-600">Responsável *</label>
                                    <select 
                                        value={newResp} 
                                        onChange={(e) => setNewResp(e.target.value)} 
                                        className={`${inputClass} h-7.5`}
                                        disabled={companies.length === 0}
                                    >
                                        {companies.map((c, i) => (
                                            <option key={i} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="button" size="sm" onClick={handleAddDiscipline} className="h-7.5 px-3 bg-[#9C1915] hover:bg-[#7D1411] text-white font-bold text-xs shrink-0">
                                    <Plus className="w-3 h-3 mr-1" />
                                    Adicionar
                                </Button>
                            </div>

                            {/* TABELA DA RELAÇÃO DE DISCIPLINAS DO PROJETO */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#9C1915] text-white font-bold uppercase tracking-wider text-[10px] h-8">
                                            <th className="py-1.5 px-3 w-20">Sigla</th>
                                            <th className="py-1.5 px-3">Nome da Disciplina</th>
                                            <th className="py-1.5 px-3 w-36">Responsável As-Built</th>
                                            <th className="py-1.5 px-3 text-right w-20">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {disciplines.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                                                    Nenhuma disciplina cadastrada.
                                                </td>
                                            </tr>
                                        ) : (
                                            disciplines.map((item, idx) => {
                                                const isEditing = editingIdx === idx;

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                        {isEditing ? (
                                                            <>
                                                                <td className="py-1.5 px-3">
                                                                    <input 
                                                                        value={editSigla} 
                                                                        onChange={(e) => setEditSigla(e.target.value)} 
                                                                        className="w-full px-1.5 py-0.5 border rounded text-xs uppercase font-bold"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5 px-3">
                                                                    <input 
                                                                        value={editNome} 
                                                                        onChange={(e) => setEditNome(e.target.value)} 
                                                                        className="w-full px-1.5 py-0.5 border rounded text-xs"
                                                                    />
                                                                </td>
                                                                <td className="py-1.5 px-3">
                                                                    <select 
                                                                        value={editResp} 
                                                                        onChange={(e) => setEditResp(e.target.value)} 
                                                                        className="w-full px-1.5 py-0.5 border rounded text-xs"
                                                                    >
                                                                        {companies.map((c, i) => (
                                                                            <option key={i} value={c}>{c}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="py-1.5 px-3 text-right space-x-1">
                                                                    <button 
                                                                        onClick={() => saveEditDiscipline(idx)} 
                                                                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                                        title="Salvar"
                                                                    >
                                                                        <Save className="w-3 h-3" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingIdx(null)} 
                                                                        className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                        title="Cancelar"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="py-2 px-3 font-bold text-[#9C1915] uppercase font-mono">
                                                                    {item.sigla}
                                                                </td>
                                                                <td className="py-2 px-3 font-semibold text-slate-800">
                                                                    {item.nome}
                                                                </td>
                                                                <td className="py-2 px-3">
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                                                                        {item.responsavel}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 px-3 text-right space-x-1">
                                                                    <button 
                                                                        onClick={() => startEditDiscipline(idx, item)} 
                                                                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                                        title="Editar"
                                                                    >
                                                                        <Pencil className="w-3 h-3" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleRemoveDiscipline(idx)} 
                                                                        className="p-1 rounded text-slate-400 hover:text-[#9C1915] hover:bg-red-50 transition-colors"
                                                                        title="Excluir"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Rooms List Tab — Lista de Salas do Projeto
// ============================================================================
function RoomsListTab({ projectId, inputClass }: { projectId: string; inputClass: string }) {
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
    const [searchTerm, setSearchTerm] = useState('');
    const [savingMaster, setSavingMaster] = useState(false);

    const utils = trpc.useUtils();
    const invalidateRooms = () => utils.projects.getSalasByProject.invalidate({ projectId });

    const { data: existingRooms, isLoading: loadingRooms } = trpc.projects.getSalasByProject.useQuery({ projectId });

    const saveMasterListMutation = trpc.projects.saveMasterList.useMutation({
        onSuccess: (result) => {
            toast.success(`Lista salva! ${result.created} salas criadas.`);
            setMasterList([]);
            invalidateRooms();
            setSavingMaster(false);
        },
        onError: (err: any) => {
            toast.error('Erro ao salvar salas', { description: err.message });
            setSavingMaster(false);
        },
    });

    const filteredRooms = (existingRooms || []).filter((s: any) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (s.nome || "").toLowerCase().includes(term) ||
            (s.numeroSala || "").toLowerCase().includes(term) ||
            (s.edificacao || "").toLowerCase().includes(term) ||
            (s.pavimento || "").toLowerCase().includes(term)
        );
    });

    const groupedExisting = filteredRooms.reduce((acc: Record<string, Record<string, Record<string, any[]>>>, sala: any) => {
        const edif = sala.edificacao || 'Sem Edificação';
        const pav = sala.pavimento || 'Sem Pavimento';
        const setor = sala.setor || 'Geral';
        if (!acc[edif]) acc[edif] = {};
        if (!acc[edif][pav]) acc[edif][pav] = {};
        if (!acc[edif][pav][setor]) acc[edif][pav][setor] = [];
        acc[edif][pav][setor].push(sala);
        return acc;
    }, {});

    const totalExistingCount = existingRooms?.length || 0;

    const addSalaToList = () => {
        if (!newEdificacao.trim() || !newPavimento.trim() || !newNome.trim() || !newNumeroSala.trim()) {
            toast.error('Preencha Edificação, Pavimento, Nome e Nº da Sala.');
            return;
        }
        setMasterList(prev => [...prev, {
            edificacao: newEdificacao.trim(),
            pavimento: newPavimento.trim(),
            setor: newSetor.trim() || 'Geral',
            nome: newNome.trim(),
            numeroSala: newNumeroSala.trim(),
        }]);
        setNewNome('');
        setNewNumeroSala('');
        toast.success('Sala adicionada à prévia!');
    };

    const handleSaveMasterList = () => {
        if (masterList.length === 0) return;
        setSavingMaster(true);
        saveMasterListMutation.mutate({ projectId, salas: masterList });
    };

    return (
        <div className="space-y-3">
            {/* Card da Lista de Salas com Busca e Visualização em Árvore */}
            <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                <CardHeader className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-[#9C1915]" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Salas Cadastradas no Projeto ({totalExistingCount})
                        </CardTitle>
                    </div>

                    <div className="relative w-full sm:w-48">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input
                            placeholder="Buscar sala..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:border-[#9C1915]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-3.5">
                    {loadingRooms ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#9C1915] mb-1" />
                            Carregando salas...
                        </div>
                    ) : totalExistingCount === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                            Nenhuma sala cadastrada.
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                            {Object.entries(groupedExisting).map(([edif, pavimentos]) => (
                                <div key={edif} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <button
                                        className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                        onClick={() => setExpandedEdif(prev => ({ ...prev, [edif]: !prev[edif] }))}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {expandedEdif[edif] ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                                            <Building2 className="w-3.5 h-3.5 text-[#9C1915]" />
                                            <span className="font-bold text-xs text-slate-800 uppercase">{edif}</span>
                                        </div>
                                    </button>

                                    {expandedEdif[edif] && (
                                        <div className="p-2 space-y-2 bg-white">
                                            {Object.entries(pavimentos).map(([pav, setores]) => (
                                                <div key={pav} className="border-l-2 border-slate-200 pl-2.5 ml-1.5 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-700 uppercase block">{pav}</span>
                                                    {Object.entries(setores).map(([setor, rooms]) => (
                                                        <div key={setor} className="space-y-0.5">
                                                            {rooms.map((sala: any) => (
                                                                <div key={sala.id} className="flex items-center justify-between text-xs py-0.5 px-1.5 hover:bg-slate-50 rounded">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-mono font-bold text-[#9C1915] text-[11px]">#{sala.numeroSala}</span>
                                                                        <span className="font-medium text-slate-800 text-[11px]">{sala.nome}</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        {setor}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Adicionar Novas Salas */}
            <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
                <CardHeader className="p-2.5 px-3.5 bg-slate-50 border-b border-slate-200">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Adicionar Nova Sala
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-slate-600">Edificação</label>
                            <input placeholder="Ex: Prédio Produção" value={newEdificacao} onChange={(e) => setNewEdificacao(e.target.value)} className={`${inputClass} h-7`} />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-slate-600">Pavimento</label>
                            <input placeholder="Ex: Térreo" value={newPavimento} onChange={(e) => setNewPavimento(e.target.value)} className={`${inputClass} h-7`} />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-slate-600">Setor</label>
                            <input placeholder="Ex: Geral" value={newSetor} onChange={(e) => setNewSetor(e.target.value)} className={`${inputClass} h-7`} />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-slate-600">Nome Sala</label>
                            <input placeholder="Ex: Escritório" value={newNome} onChange={(e) => setNewNome(e.target.value)} className={`${inputClass} h-7`} />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-slate-600">Nº Sala</label>
                            <div className="flex gap-1">
                                <input placeholder="101" value={newNumeroSala} onChange={(e) => setNewNumeroSala(e.target.value)} className={`${inputClass} h-7`} />
                                <Button type="button" size="sm" onClick={addSalaToList} className="h-7 px-2 bg-[#9C1915] hover:bg-[#7D1411] text-white">
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {masterList.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-700">{masterList.length} salas na prévia</span>
                            <Button onClick={handleSaveMasterList} disabled={savingMaster} size="sm" className="h-7 px-3 bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs">
                                {savingMaster ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                Salvar Salas
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
