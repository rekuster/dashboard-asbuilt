
/*
 * ESTE ARQUIVO É O "MAPEAMENTO AS-BUILT" POR DISCIPLINA.
 * Permite que o usuário valide os modelos as-built focando em uma disciplina por vez.
 * Ao abrir o modelo de uma disciplina (ex: Hidrossanitário), o usuário vê aqui 
 * todos os pontos onde foram identificadas divergências para aquela disciplina.
 * 
 * EXPLICAÇÃO PARA O USUÁRIO:
 * Este painel é como um "Check-list" gigante. Em vez de olhar sala por sala, 
 * você escolhe uma disciplina (como Elétrica ou Hidráulica) e o sistema te mostra
 * todos os lugares do prédio onde ainda existem pendências nessa disciplina.
 * É a ferramenta ideal para quem está conferindo o modelo no computador.
 */

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
    ChevronDown,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    Building2,
    Layers,
    ListChecks
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerificationModal } from "./VerificationModal";

/**
 * MAPEAMENTO DE DISCIPLINAS (SIGLA -> NOME COMPLETO)
 * O campo de obras usa siglas (ELE, HID) e o escopo usa nomes completos.
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

export default function DisciplineValidationTab() {
    const [search, setSearch] = useState("");
    const [expandedDisciplines, setExpandedDisciplines] = useState<string[]>([]);
    
    // Checklist Modal State
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [selectedDisciplineForModal, setSelectedDisciplineForModal] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery();
    const { data: apontamentos = [] } = trpc.dashboard.getApontamentos.useQuery();
    const { data: allVerificacoes = [] } = trpc.dashboard.getAllVerificacoes.useQuery();

    const toggleDiscipline = (discipline: string) => {
        setExpandedDisciplines(prev => 
            prev.includes(discipline) 
                ? prev.filter(d => d !== discipline) 
                : [...prev, discipline]
        );
    };

    // Helper to normalize edifice names
    const normalizeEdificacao = (name: string) => {
        const n = (name || "").trim().toLowerCase();
        if (n === "produção") return "Prédio Produção";
        if (n === "suporte") return "Prédio Suporte";
        if (n === "central utilidades") return "Central de Utilidades";
        return name;
    };

    // LÓGICA DE AGRUPAMENTO: Organiza os dados em Disciplina -> Edificação -> Sala
    const groupedData = useMemo(() => {
        /**
         * EXPLICAÇÃO PARA O USUÁRIO:
         * Esta parte do código funciona como um "filtro inteligente". 
         * Ela percorre todas as salas e disciplinas e só separa para mostrar aquelas 
         * que possuem algum problema (apontamento) ainda não resolvido.
         * Além disso, ela utiliza o mapeamento de siglas (ELE -> Elétrica) para não perder nenhum dado.
         */
        
        const map: Record<string, Record<string, any[]>> = {};
        const availableDisciplines = Array.from(new Set(escopos.map((e: any) => e.disciplina)));

        // 1. Populamos o mapa apenas com salas que possuem apontamentos
        salas.forEach((sala: any) => {
            const edifNorm = normalizeEdificacao(sala.edificacao);
            
            availableDisciplines.forEach(disc => {
                const discInBuilding = escopos.find((e: any) => 
                    e.disciplina === disc && normalizeEdificacao(e.edificacao) === edifNorm
                );
                
                if (discInBuilding) {
                    const verification = allVerificacoes.find((v: any) => v.salaId === sala.id && v.disciplina === disc);
                    
                    // FILTRAGEM INTELIGENTE: Considera siglas (ELE) e nomes completos
                    const pendingApontamentos = apontamentos.filter((a: any) => 
                        a.sala === sala?.nome && 
                        isSameDiscipline(a.disciplina, (disc as any)) && 
                        a.status === 'PENDENTE'
                    );

                    // Só mostramos a sala se ela tiver pendências registradas
                    if (pendingApontamentos.length > 0) {
                        const discKey = (disc as any);
                        const edifKey = (sala.edificacao as any);
                        if (!map[discKey]) map[discKey] = {};
                        if (!map[discKey][edifKey]) map[discKey][edifKey] = [];
                        
                        map[discKey][edifKey].push({
                            ...sala,
                            statusDisciplina: verification?.status || "PENDENTE",
                            apontamentosCount: pendingApontamentos.length,
                            hasPending: true
                        });
                    }
                }
            });
        });

        // 2. Ordenação e Busca
        const finalMap: any = {};
        const searchLower = search.toLowerCase();

        Object.keys(map).forEach(disc => {
            const discData: any = {};
            let hasMatchInDisc = false;
            const matchesDiscName = disc.toLowerCase().includes(searchLower);

            Object.keys(map[disc]).forEach(edif => {
                // Filtramos por busca (se houver) e ordenamos numericamente
                const filteredAndSorted = map[disc][edif]
                    .filter((s: any) => 
                        matchesDiscName || 
                        s.nome.toLowerCase().includes(searchLower) || 
                        s.numeroSala.toLowerCase().includes(searchLower)
                    )
                    .sort((a, b) => 
                        String(a.numeroSala).localeCompare(String(b.numeroSala), undefined, { numeric: true, sensitivity: 'base' })
                    );

                if (filteredAndSorted.length > 0) {
                    discData[edif] = filteredAndSorted;
                    hasMatchInDisc = true;
                }
            });

            if (hasMatchInDisc) {
                finalMap[disc] = discData;
            }
        });

        return finalMap;
    }, [salas, escopos, apontamentos, allVerificacoes, search]);

    const disciplines = Object.keys(groupedData).sort();

    return (
        <div className="space-y-6 font-sans pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-[#940707]" />
                        Validação por Disciplina
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Inverso da tabela de salas: selecione a disciplina para ver onde há divergências no modelo.
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Filtrar disciplina ou sala..."
                        className="pl-9 w-[300px] bg-white border-slate-200 focus:ring-[#940707] transition-all rounded-full h-10 shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {disciplines.length === 0 ? (
                    <Card className="border-dashed border-2 py-20 bg-slate-50/50">
                        <div className="flex flex-col items-center gap-3 text-slate-400 italic">
                            <Layers className="w-12 h-12 opacity-20" />
                            <span>Nenhuma disciplina encontrada com os filtros atuais.</span>
                        </div>
                    </Card>
                ) : (
                    disciplines.map(disc => {
                        const isExpanded = expandedDisciplines.includes(disc) || search !== "";
                        const edifs = Object.keys(groupedData[disc]);
                        
                        // Calc stats for this discipline
                        let totalSalas = 0;
                        let okSalas = 0;
                        let pendingSalas = 0;
                        
                        edifs.forEach(ed => {
                            groupedData[disc][ed].forEach((s: any) => {
                                totalSalas++;
                                if (s.statusDisciplina === "OK") okSalas++;
                                if (s.apontamentosCount > 0) pendingSalas++;
                            });
                        });

                        const isComplete = okSalas === totalSalas && totalSalas > 0;

                        return (
                            <Card key={disc} className={`border-none shadow-lg overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-[#940707]/20 shadow-[#940707]/5' : 'hover:shadow-[#940707]/10'}`}>
                                <CardHeader 
                                    className={`py-4 px-6 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-[#940707]/5' : 'bg-white hover:bg-slate-50'}`}
                                    onClick={() => toggleDiscipline(disc)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-[#940707]" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                            <div>
                                                <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">{disc}</CardTitle>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        {edifs.length} Edificações
                                                    </span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-[11px] font-bold text-slate-500">
                                                        {totalSalas} Salas no Escopo
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {pendingSalas > 0 && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase border border-amber-200">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {pendingSalas} salas com divergências
                                                </div>
                                            )}
                                            
                                            <div className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase border-2 flex items-center gap-2 ${
                                                isComplete 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-500/30' 
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                                {isComplete && <CheckCircle2 className="w-4 h-4" />}
                                                {isComplete ? 'Validado 100%' : `${okSalas} / ${totalSalas} Verificadas`}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="p-0 border-t border-[#940707]/10 bg-white">
                                        <div className="divide-y divide-slate-100">
                                            {edifs.map(edif => (
                                                <div key={edif} className="p-4">
                                                    <h4 className="text-xs font-bold text-[#940707] uppercase mb-3 flex items-center gap-2">
                                                        <div className="w-1.5 h-3 bg-[#940707] rounded-full"></div>
                                                        {edif}
                                                    </h4>
                                                    <Table>
                                                        <TableHeader className="bg-slate-50/50">
                                                            <TableRow className="hover:bg-transparent border-slate-100 h-8">
                                                                <TableHead className="text-[10px] font-black text-slate-400 uppercase">Pavimento</TableHead>
                                                                <TableHead className="text-[10px] font-black text-slate-400 uppercase">Sala / Ambiente</TableHead>
                                                                <TableHead className="w-[150px] text-center text-[10px] font-black text-slate-400 uppercase">Divergências</TableHead>
                                                                <TableHead className="w-[150px] text-center text-[10px] font-black text-slate-400 uppercase">Status Disciplina</TableHead>
                                                                <TableHead className="w-[100px] text-center text-[10px] font-black text-slate-400 uppercase">Ação</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {groupedData[disc][edif].map((sala: any) => (
                                                                <TableRow key={sala.id} className="hover:bg-slate-50/30 border-slate-50 h-12">
                                                                    <TableCell className="text-[11px] font-medium text-slate-600">{sala.pavimento}</TableCell>
                                                                    <TableCell className="py-2">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-800 text-sm">{sala.nome}</span>
                                                                            <span className="text-[10px] text-slate-400">Nº {sala.numeroSala}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {sala.apontamentosCount > 0 ? (
                                                                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold px-2 py-0.5 text-[10px]">
                                                                                {sala.apontamentosCount} {sala.apontamentosCount === 1 ? 'PENDÊNCIA' : 'PENDÊNCIAS'}
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-[10px] text-emerald-600 font-bold">✓ LIMPO</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                                                            sala.statusDisciplina === "OK" 
                                                                                ? "bg-emerald-100 text-emerald-700" 
                                                                                : "bg-slate-100 text-slate-400"
                                                                        }`}>
                                                                            {sala.statusDisciplina}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="h-8 rounded-full border-slate-200 hover:border-[#940707] hover:bg-[#940707] hover:text-white transition-all group"
                                                                            onClick={() => {
                                                                                setSelectedSala(sala);
                                                                                setSelectedDisciplineForModal(disc);
                                                                                setIsModalOpen(true);
                                                                            }}
                                                                        >
                                                                            <ListChecks className="w-3.5 h-3.5 mr-1.5 group-hover:scale-110" />
                                                                            Conferir
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {isModalOpen && selectedSala && (
                <VerificationModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    sala={selectedSala}
                    disciplines={[selectedDisciplineForModal]} // Only show the current filtered discipline
                    pendingApontamentos={{
                        [selectedDisciplineForModal]: selectedSala.apontamentosCount
                    }}
                />
            )}
        </div>
    );
}
