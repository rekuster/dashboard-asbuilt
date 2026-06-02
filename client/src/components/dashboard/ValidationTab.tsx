
/*
 * ESTE ARQUIVO É O "MAPEAMENTO AS-BUILT" POR SALA (Versão 2.0).
 * Reorganizado por Disciplina com Grid de Salas expansível.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    Clock,
    LayoutGrid,
    Filter,
    Zap,
    Wind,
    Droplets,
    Flame,
    Building2,
    Pencil,
    Cpu,
    Home,
    Network,
    Hammer,
    Gauge,
    AlertCircle
} from "lucide-react";
import { VerificationModal } from "./VerificationModal";

export default function ValidationTab({ projectId }: { projectId: string }) {
    const [search, setSearch] = useState("");
    const [filterEdificacao, setFilterEdificacao] = useState("Todas");
    const [expandedDisciplines, setExpandedDisciplines] = useState<string[]>([]);
    
    // Checklist Modal State
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [modalDiscipline, setModalDiscipline] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery({ projectId });
    const { data: pointingStats = [] } = trpc.dashboard.getApontamentos.useQuery({ projectId });
    const { data: allVerificacoes = [] } = trpc.dashboard.getAllVerificacoes.useQuery({ projectId });

    // Filtro de Edificações únicas
    const uniqueEdificacoes = useMemo(() => 
        Array.from(new Set((salas as any[]).map((s: any) => s.edificacao))).sort() as string[]
    , [salas]);

    // Filtrar salas pela edificação e busca
    const filteredSalas = useMemo(() => {
        const searchLower = search.toLowerCase();
        return (salas as any[]).filter((s: any) => {
            const matchesEdificacao = filterEdificacao === "Todas" || s.edificacao === filterEdificacao;
            const matchesSearch = !search || 
                (s.nome || "").toLowerCase().includes(searchLower) ||
                (s.numeroSala || "").toLowerCase().includes(searchLower);
            return matchesEdificacao && matchesSearch;
        }).sort((a: any, b: any) => {
            const nA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            const nB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            return nA - nB;
        });
    }, [salas, filterEdificacao, search]);
    
    // Mapeamento de Ícones por Disciplina
    const DISCIPLINE_ICONS: Record<string, any> = {
        'ARQ': Home,
        'ARQUITETURA': Home,
        'EST': Building2,
        'ESTRUTURA': Building2,
        'ELE': Zap,
        'ELEMT': Zap,
        'ELÉTRICA': Zap,
        'ELÉTRICA MÉDIA TENSÃO': Zap,
        'CLI': Wind,
        'CLIM': Wind,
        'CLIMATIZAÇÃO': Wind,
        'HID': Droplets,
        'HIDRÁULICA': Droplets,
        'HIDROSANITÁRIO': Droplets,
        'PCI': Flame,
        'SDAI': Flame,
        'INCÊNDIO': Flame,
        'AUT': Cpu,
        'AUTOMAÇÃO': Cpu,
        'LOG': Network,
        'LÓGICA': Network,
        'REDE': Network,
        'CFTV': Network,
        'MET': Hammer,
        'METÁLICA': Hammer,
        'UTI': Gauge,
        'UTILIDADES': Gauge,
    };

    // Disciplinas que POSSUEM PENDÊNCIAS ATIVAS
    const availableDisciplines = useMemo(() => {
        const discWithIssues = new Set<string>();
        
        // Só mostra disciplinas que têm apontamentos pendentes
        (pointingStats as any[]).forEach((a: any) => {
            if (a.status === 'ATIVA' || a.status === 'EM_REVISAO') {
                discWithIssues.add(a.disciplina);
            }
        });

        return Array.from(discWithIssues).sort() as string[];
    }, [pointingStats]);

    // Mapeamento de status: Sala + Disciplina -> Status
    const statusMap = useMemo(() => {
        const map: Record<string, string> = {};
        (allVerificacoes as any[]).forEach((v: any) => {
            map[`${v.salaId}-${v.disciplina}`] = v.status;
        });
        return map;
    }, [allVerificacoes]);

    // Apontamentos pendentes por sala e disciplina
    const activeApontamentos = useMemo(() => {
        const map: Record<string, number> = {};
        (pointingStats as any[]).forEach((a: any) => {
            if (a.status === 'ATIVA') {
                const key = `${a.sala}-${a.disciplina}`;
                map[key] = (map[key] || 0) + 1;
            }
        });
        return map;
    }, [pointingStats]);

    // Apontamentos em revisão por sala e disciplina
    const revisionApontamentos = useMemo(() => {
        const map: Record<string, number> = {};
        (pointingStats as any[]).forEach((a: any) => {
            if (a.status === 'EM_REVISAO') {
                const key = `${a.sala}-${a.disciplina}`;
                map[key] = (map[key] || 0) + 1;
            }
        });
        return map;
    }, [pointingStats]);

    const toggleDiscipline = (disc: string) => {
        setExpandedDisciplines(prev => 
            prev.includes(disc) ? prev.filter(d => d !== disc) : [...prev, disc]
        );
    };

    const handleRoomClick = (sala: any, discipline: string) => {
        setSelectedSala(sala);
        setModalDiscipline(discipline);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Filters Section */}
            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardCheck className="w-6 h-6 text-[#940707]" />
                                Validação por Disciplina
                            </CardTitle>
                            <CardDescription>Clique nas salas para validar os modelos as-built entregues</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Equipamento, tag ou nome..."
                                    className="pl-9 w-[280px] bg-white border-slate-200 focus:ring-[#940707] transition-all rounded-full h-10 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full border border-slate-200">
                                <div className="pl-3 pr-1">
                                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <select
                                    className="h-8 pr-8 pl-1 bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none cursor-pointer"
                                    value={filterEdificacao}
                                    onChange={(e) => setFilterEdificacao(e.target.value)}
                                >
                                    <option value="Todas">Todas Edificações</option>
                                    {uniqueEdificacoes.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Disciplines List */}
            <div className="space-y-4">
                {availableDisciplines.map(discipline => {
                    const isExpanded = expandedDisciplines.includes(discipline);
                    // Calcular estatísticas APENAS das salas que têm pendência nesta disciplina
                    const roomsWithIssues = filteredSalas.filter(sala => 
                        activeApontamentos[`${sala.nome}-${discipline}`] > 0 ||
                        revisionApontamentos[`${sala.nome}-${discipline}`] > 0
                    );

                    const roomTotal = roomsWithIssues.length;
                    
                    // Se não houver salas com pendência, não deveríamos nem estar vendo esta disciplina 
                    // (devido ao filtro no availableDisciplines), mas por segurança:
                    if (roomTotal === 0) return null;

                    const roomStats = roomsWithIssues.reduce((acc: any, sala: any) => {
                        const status = statusMap[`${sala.id}-${discipline}`];
                        if (status === "OK") acc.ok++;
                        else acc.issue++;
                        return acc;
                    }, { ok: 0, issue: 0 });

                    const progress = roomTotal > 0 ? (roomStats.ok / roomTotal) * 100 : 0;

                    return (
                        <Card key={discipline} className="border-none shadow-lg overflow-hidden bg-white/80 transition-all duration-300">
                            {/* Discipline Header Bar */}
                            <div 
                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'border-b border-slate-100 bg-slate-50/30' : ''}`}
                                onClick={() => toggleDiscipline(discipline)}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    {(() => {
                                        const DisciplineIcon = DISCIPLINE_ICONS[discipline.toUpperCase()] || DISCIPLINE_ICONS[discipline.split(' ')[0].toUpperCase()] || LayoutGrid;

                                        return (
                                            <div className={`p-2 rounded-xl border ${isExpanded ? 'bg-[#940707] text-white border-[#940707]' : 'bg-white text-slate-400 border-slate-200'}`}>
                                                <DisciplineIcon className="w-5 h-5" />
                                            </div>
                                        );
                                    })()}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-700 uppercase tracking-tight">{discipline}</h3>
                                            <Badge variant="outline" className="text-[10px] bg-slate-100 border-slate-200 py-0 h-4 text-[#940707] font-black">
                                                {roomTotal} PENDENTES
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="flex-1 max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-[#940707]'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 ml-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Qualidade:</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {progress.toFixed(1)}% OK
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 ml-2">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[10px] font-bold text-slate-500">{roomStats.ok} OK</span>
                                                </div>
                                                {roomStats.issue > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                        <span className="text-[10px] font-bold text-rose-500">{roomStats.issue} Pendentes</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>

                            {/* Discipline Content (Room Grid grouped by Edificacao) */}
                            {isExpanded && (
                                <CardContent className="p-6 bg-slate-50/20 space-y-6">
                                    {(() => {
                                        // 1. Filtrar apenas salas que têm pendência nesta disciplina
                                        const roomsWithIssues = filteredSalas.filter(sala => 
                                            activeApontamentos[`${sala.nome}-${discipline}`] > 0 ||
                                            revisionApontamentos[`${sala.nome}-${discipline}`] > 0
                                        );

                                        // 2. Agrupar por Edificacao
                                        const groupedByEdificacao: Record<string, any[]> = {};
                                        roomsWithIssues.forEach(s => {
                                            if (!groupedByEdificacao[s.edificacao]) groupedByEdificacao[s.edificacao] = [];
                                            groupedByEdificacao[s.edificacao].push(s);
                                        });

                                        const edificacoes = Object.keys(groupedByEdificacao).sort();

                                        if (edificacoes.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 italic">
                                                    <Clock className="w-8 h-8 mb-2 opacity-20" />
                                                    <span>Nenhuma pendência encontrada para os filtros atuais.</span>
                                                </div>
                                            );
                                        }

                                        return edificacoes.map(edif => (
                                            <div key={edif} className="space-y-3">
                                                <div className="flex items-center gap-2 border-l-4 border-[#940707] pl-3">
                                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{edif}</h4>
                                                    <Badge variant="outline" className="bg-slate-200/50 border-transparent text-[9px] h-4 px-1.5 text-slate-500 font-bold">{groupedByEdificacao[edif].length} Itens</Badge>
                                                </div>
                                                
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                                                    {groupedByEdificacao[edif].map((sala: any) => {
                                                        const status = statusMap[`${sala.id}-${discipline}`];
                                                        const hasApontamento = activeApontamentos[`${sala.nome}-${discipline}`];
                                                        const hasRevision = revisionApontamentos[`${sala.nome}-${discipline}`];
                                                        
                                                        let bgClass = "bg-white border-slate-200 text-slate-400 hover:border-[#940707] hover:text-[#940707]";
                                                        let icon = null;

                                                        if (status === "OK") {
                                                            bgClass = "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100";
                                                            icon = <CheckCircle2 className="w-2.5 h-2.5 absolute top-1 right-1" />;
                                                        } else if (hasRevision) {
                                                            bgClass = "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100";
                                                            icon = <Clock className="w-2.5 h-2.5 absolute top-1 right-1" />;
                                                        } else if (hasApontamento) {
                                                            bgClass = "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 animate-pulse";
                                                            icon = <AlertCircle className="w-2.5 h-2.5 absolute top-1 right-1" />;
                                                        } else if (status === "NAO_CONFORME") {
                                                            bgClass = "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100";
                                                            icon = <XCircle className="w-2.5 h-2.5 absolute top-1 right-1" />;
                                                        }

                                                        return (
                                                            <button
                                                                key={sala.id}
                                                                onClick={() => handleRoomClick(sala, discipline)}
                                                                className={`
                                                                    relative flex flex-col items-center justify-center h-12 rounded-xl border text-[10px] font-bold transition-all
                                                                    shadow-sm hover:translate-y-[-2px] hover:shadow-md
                                                                    ${bgClass}
                                                                `}
                                                                title={`${sala.numeroSala} - ${sala.nome}`}
                                                            >
                                                                {icon}
                                                                <span className="truncate w-full px-1">{sala.numeroSala}</span>
                                                                <span className="text-[8px] opacity-60 leading-tight uppercase font-black text-slate-400 truncate max-w-full px-1">{sala.nome.split(' ')[0]}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </CardContent>
                            )}
                        </Card>
                    );
                })}

                {availableDisciplines.length === 0 && (
                    <div className="p-20 text-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <XCircle className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest italic">Nenhuma disciplina cadastrada para este filtro</h3>
                        <p className="text-sm text-slate-400 mt-2">Verifique as configurações do projeto ou o filtro de edificação.</p>
                    </div>
                )}
            </div>

            {/* Verification Modal Integration */}
            <VerificationModal 
                projectId={projectId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                sala={selectedSala}
                // When we open from here, we can either restrict to just that discipline or show all
                disciplines={selectedSala ? [modalDiscipline!] : []}
                pendingApontamentos={selectedSala && modalDiscipline ? { [modalDiscipline]: (activeApontamentos[`${selectedSala.nome}-${modalDiscipline}`] || 0) + (revisionApontamentos[`${selectedSala.nome}-${modalDiscipline}`] || 0) } : {}}
            />
        </div>
    );
}
