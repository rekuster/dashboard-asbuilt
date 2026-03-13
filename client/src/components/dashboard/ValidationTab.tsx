
/*
 * ESTE ARQUIVO É O "MAPEAMENTO AS-BUILT" POR SALA.
 * Foi criado a partir do DataHub, mas focado na validação final dos modelos.
 * Aqui você pode marcar disciplina por disciplina o que já foi conferido no As-Built.
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
    ListChecks,
    Image as ImageIcon,
    ClipboardCheck
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VerificationModal } from "./VerificationModal";

export default function ValidationTab() {
    const [search, setSearch] = useState("");
    const [filterEdificacao, setFilterEdificacao] = useState("Todas");
    const [filterPavimento, setFilterPavimento] = useState("Todos");
    
    // Checklist Modal State
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery();
    const { data: apontamentos = [] } = trpc.dashboard.getApontamentos.useQuery();

    // Map of pending apuntamentos per sala and discipline
    const pendingBySalaAndDisc = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        apontamentos.forEach((a: any) => {
            if (a.status !== 'PENDENTE') return;
            const sKey = a.sala;
            const dKey = a.disciplina;
            if (!map[sKey]) map[sKey] = {};
            map[sKey][dKey] = (map[sKey][dKey] || 0) + 1;
        });
        return map;
    }, [apontamentos]);

    // Helper to normalize edifice names between Salas and Escopo
    const normalizeEdificacao = (name: string) => {
        const n = (name || "").trim().toLowerCase();
        if (n === "produção") return "Prédio Produção";
        if (n === "suporte") return "Prédio Suporte";
        if (n === "central utilidades") return "Central de Utilidades";
        return name; // Return original if no mapping or already correct
    };

    const requiredByEdificacao: Record<string, string[]> = useMemo(() => {
        const mapping: Record<string, string[]> = {};
        escopos.forEach((item: any) => {
            const ed = (item.edificacao || "").trim();
            if (!ed) return;
            if (!mapping[ed]) mapping[ed] = [];
            if (!mapping[ed].includes(item.disciplina)) {
                mapping[ed].push(item.disciplina);
            }
        });
        return mapping;
    }, [escopos]);

    const sortedSalas = useMemo(() => {
        const filtered = (salas || []).filter((s: any) => {
            const searchLower = (search || "").toLowerCase();
            const matchesSearch = (s.nome || "").toLowerCase().includes(searchLower) ||
                (s.edificacao || "").toLowerCase().includes(searchLower) ||
                (s.pavimento || "").toLowerCase().includes(searchLower) ||
                (s.numeroSala || "").toLowerCase().includes(searchLower);

            const matchesEdificacao = filterEdificacao === "Todas" || s.edificacao === filterEdificacao;
            const matchesPavimento = filterPavimento === "Todos" || s.pavimento === filterPavimento;

            return matchesSearch && matchesEdificacao && matchesPavimento;
        });

        return [...filtered].sort((a, b) => {
            const nA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            const nB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            if (nA !== nB) return nA - nB;
            return (a.nome || "").localeCompare(b.nome || "");
        });
    }, [salas, search, filterEdificacao, filterPavimento]);

    const uniqueEdificacoes = useMemo(() => Array.from(new Set(salas.map((s: any) => s.edificacao))).sort() as string[], [salas]);
    const uniquePavimentos = useMemo(() => {
        const filteredByBuilding = filterEdificacao === "Todas" ? salas : salas.filter((s: any) => s.edificacao === filterEdificacao);
        return Array.from(new Set(filteredByBuilding.map((s: any) => s.pavimento))).sort() as string[];
    }, [salas, filterEdificacao]);

    return (
        <div className="space-y-6 font-sans">
            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardCheck className="w-6 h-6 text-[#940707]" />
                                Validação As-Built por Sala
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                                Controle de Verificação de Modelos
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar sala..."
                                    className="pl-9 w-[250px] bg-white border-slate-200 focus:ring-[#940707] transition-all rounded-full h-9 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <select
                                className="h-9 px-3 rounded-full border border-slate-200 bg-white text-sm focus:ring-[#940707] outline-none"
                                value={filterEdificacao}
                                onChange={(e) => {
                                    setFilterEdificacao(e.target.value);
                                    setFilterPavimento("Todos");
                                }}
                            >
                                <option value="Todas">Todas Edificações</option>
                                {uniqueEdificacoes.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>

                            <select
                                className="h-9 px-3 rounded-full border border-slate-200 bg-white text-sm focus:ring-[#940707] outline-none"
                                value={filterPavimento}
                                onChange={(e) => setFilterPavimento(e.target.value)}
                            >
                                <option value="Todos">Todos Pavimentos</option>
                                {uniquePavimentos.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-[100px] text-[11px] font-bold text-slate-500 uppercase">Edific.</TableHead>
                                    <TableHead className="w-[90px] text-[11px] font-bold text-slate-500 uppercase">Pav.</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase">Sala / Ambiente</TableHead>
                                    <TableHead className="w-[60px] text-center text-[11px] font-bold text-slate-500 uppercase">Planta</TableHead>
                                    <TableHead className="w-[100px] text-center text-[11px] font-bold text-slate-500 uppercase">Checklist</TableHead>
                                    <TableHead className="w-[100px] text-center text-[11px] font-bold text-slate-500 uppercase">Status Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedSalas.map((sala) => (
                                    <TableRow key={sala.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="font-medium text-slate-700">{sala.edificacao}</TableCell>
                                        <TableCell className="text-slate-600">{sala.pavimento}</TableCell>
                                        <TableCell className="py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{sala.nome}</span>
                                                <span className="text-[10px] text-slate-400">Nº {sala.numeroSala}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {sala.imagemPlantaUrl ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700">
                                                            <ImageIcon size={16} />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-1">
                                                        <img src={sala.imagemPlantaUrl} alt="Planta" className="rounded w-full" />
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic">N/A</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {(() => {
                                                const pendingDiscs = Object.keys(pendingBySalaAndDisc[sala.nome] || {});
                                                const totalReqs = pendingDiscs.length;
                                                const hasMajorPendencies = totalReqs > 0;

                                                return (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className={`h-8 w-8 p-0 border-slate-200 transition-all rounded-full relative ${
                                                            hasMajorPendencies ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'hover:border-[#940707] hover:bg-[#940707] hover:text-white'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedSala(sala);
                                                            setIsModalOpen(true);
                                                        }}
                                                        title={`Checklist: ${totalReqs} modelos`}
                                                    >
                                                        <ListChecks className="w-4 h-4" />
                                                        {totalReqs > 0 && (
                                                            <span className="absolute -top-1 -right-1 bg-[#940707] text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                                                {totalReqs}
                                                            </span>
                                                        )}
                                                    </Button>
                                                );
                                            })()}
                                        </TableCell>
                                         <TableCell className="text-center">
                                             {(() => {
                                                 const reqs = requiredByEdificacao[normalizeEdificacao(sala.edificacao)] || [];
                                                 if (reqs.length === 0) return (
                                                     <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 uppercase">
                                                         SEM REQUISITOS
                                                     </span>
                                                 );
                                                 
                                                 // This would ideally come from a joined query, but for now we'll handle it if we have context
                                                 // Since we are in a loop, we can't easily fetch individual verifications without a lot of queries
                                                 // We'll leave it as "Pendente" until we add a "allVerificacoes" query
                                                 return (
                                                     <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 uppercase">
                                                         Pendente
                                                     </span>
                                                 );
                                             })()}
                                         </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <VerificationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                sala={selectedSala}
                disciplines={selectedSala ? Object.keys(pendingBySalaAndDisc[selectedSala.nome] || {}) : []}
                pendingApontamentos={selectedSala ? (pendingBySalaAndDisc[selectedSala.nome] || {}) : {}}
            />
        </div>
    );
}
