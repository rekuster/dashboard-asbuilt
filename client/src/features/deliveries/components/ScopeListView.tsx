import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Layers,
    Building2,
    Plus,
    Edit2,
    Trash2,
    Search,
    CheckCircle2,
    AlertTriangle,
    CopyCheck,
    Clock,
    History,
    FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TimelineParciais } from "./TimelineParciais";
import { ScopeFormModal } from "./ScopeFormModal";
import { STATUS_LABELS } from "../constants";

interface ScopeListViewProps {
    projectId: string;
    entregas: any[];
    selectedEdificacao?: string;
    onViewEntrega: (e: any) => void;
}

export function ScopeListView({
    projectId,
    entregas,
    selectedEdificacao,
    onViewEntrega,
}: ScopeListViewProps) {
    const [selectedEscopo, setSelectedEscopo] = useState<any>(null);
    const [isEscopoFormOpen, setIsEscopoFormOpen] = useState(false);
    const [editingEscopo, setEditingEscopo] = useState<any>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterEmpresa, setFilterEmpresa] = useState("todas");
    const [filterDisciplina, setFilterDisciplina] = useState("todas");
    const [filterStatus, setFilterStatus] = useState("todos");

    const { data: escopos = [], isLoading: loadingEscopos } =
        trpc.dashboard.getEscopos.useQuery({ projectId });
    const utils = trpc.useUtils();

    const deleteMutation = trpc.dashboard.deleteEscopo.useMutation({
        onSuccess: () => utils.dashboard.getEscopos.invalidate({ projectId }),
    });

    const empresasUnicas = useMemo(() => {
        const emps = new Set(escopos.map((e: any) => e.empresa).filter(Boolean));
        return Array.from(emps).sort();
    }, [escopos]);

    const disciplinasUnicas = useMemo(() => {
        const discs = new Set(escopos.map((e: any) => e.disciplina).filter(Boolean));
        return Array.from(discs).sort();
    }, [escopos]);

    const filteredEscopos = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return escopos.filter((e: any) => {
            const matchesEdif =
                !selectedEdificacao ||
                e.edificacao?.toLowerCase().includes(selectedEdificacao.toLowerCase());
            const matchesEmp =
                filterEmpresa === "todas" ||
                e.empresa?.toLowerCase() === filterEmpresa.toLowerCase();
            const matchesDisc =
                filterDisciplina === "todas" ||
                e.disciplina?.toLowerCase() === filterDisciplina.toLowerCase();
            const matchesStatus =
                filterStatus === "todos" || e.statusAuditoria === filterStatus;

            const matchesSearch =
                !q ||
                (e.nomeModelo || "").toLowerCase().includes(q) ||
                (e.nomeModeloFinal || "").toLowerCase().includes(q) ||
                (e.disciplina || "").toLowerCase().includes(q) ||
                (e.edificacao || "").toLowerCase().includes(q) ||
                (e.empresa || "").toLowerCase().includes(q);

            return (
                matchesEdif &&
                matchesEmp &&
                matchesDisc &&
                matchesStatus &&
                matchesSearch
            );
        });
    }, [
        escopos,
        selectedEdificacao,
        filterEmpresa,
        filterDisciplina,
        filterStatus,
        searchTerm,
    ]);

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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header + Filtros */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#9C1915]" />
                        Escopo Contratual de Modelos As-Built ({filteredEscopos.length} de {escopos.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                        Inventário mestre dos modelos previstos e classificação de status de auditoria Stecla.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Buscar modelo, disciplina..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 text-xs h-8 rounded-lg border-slate-200 bg-white"
                        />
                    </div>

                    <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                        <SelectTrigger className="w-[130px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                            <SelectValue placeholder="Empresa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas" className="text-xs font-bold">
                                Todas Empresas
                            </SelectItem>
                            {empresasUnicas.map((emp) => (
                                <SelectItem key={emp} value={emp} className="text-xs">
                                    {emp}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterDisciplina} onValueChange={setFilterDisciplina}>
                        <SelectTrigger className="w-[140px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                            <SelectValue placeholder="Disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas" className="text-xs font-bold">
                                Todas Disciplinas
                            </SelectItem>
                            {disciplinasUnicas.map((disc) => (
                                <SelectItem key={disc} value={disc} className="text-xs">
                                    {disc}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[140px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos" className="text-xs font-bold">
                                Todos Status
                            </SelectItem>
                            <SelectItem value="VALIDADO" className="text-xs font-bold text-emerald-700">
                                🟩 Validado
                            </SelectItem>
                            <SelectItem value="COM_PENDENCIAS" className="text-xs font-bold text-amber-700">
                                🟨 Com Pendências
                            </SelectItem>
                            <SelectItem value="IGUAL_PROJETO" className="text-xs font-bold text-[#9C1915]">
                                🟥 Igual ao Projeto
                            </SelectItem>
                            <SelectItem value="NAO_ENTREGUE" className="text-xs font-bold text-slate-500">
                                ⬜ Não Entregue
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingEscopo(null);
                            setIsEscopoFormOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Novo Modelo
                    </Button>
                </div>
            </div>

            {/* Tabela de Escopo de Modelos */}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <TableHead className="w-24">Empresa</TableHead>
                            <TableHead className="w-36">Edificação</TableHead>
                            <TableHead className="w-36">Disciplina</TableHead>
                            <TableHead>Modelo Base (Projeto)</TableHead>
                            <TableHead>Nome Final As-Built</TableHead>
                            <TableHead className="w-24 text-center">RVT Base</TableHead>
                            <TableHead className="w-44">Status Auditoria</TableHead>
                            <TableHead className="w-28 text-center">Remessas</TableHead>
                            <TableHead className="w-20 text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingEscopos ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs italic">
                                    Carregando escopo de modelos As-Built...
                                </TableCell>
                            </TableRow>
                        ) : filteredEscopos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs italic">
                                    Nenhum modelo encontrado para os filtros selecionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEscopos.map((esc: any) => {
                                const statusKey = esc.statusAuditoria || "NAO_ENTREGUE";
                                const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS["NAO_ENTREGUE"];
                                const StatusIcon = statusInfo.icon;

                                return (
                                    <TableRow
                                        key={esc.id}
                                        className="hover:bg-slate-50/70 transition-colors border-slate-100 text-xs"
                                    >
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-bold px-2 py-0.5 ${
                                                    esc.empresa?.toLowerCase() === "thá" || esc.empresa?.toLowerCase() === "tha"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-purple-50 text-purple-700 border-purple-200"
                                                }`}
                                            >
                                                {esc.empresa}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="font-semibold text-slate-800">
                                            {esc.edificacao}
                                        </TableCell>

                                        <TableCell className="font-semibold text-slate-800">
                                            {esc.disciplina}
                                        </TableCell>

                                        <TableCell className="font-mono text-[11px] text-slate-600 truncate max-w-[220px]" title={esc.nomeModelo}>
                                            {esc.nomeModelo}
                                        </TableCell>

                                        <TableCell className="font-mono text-[11px] text-slate-900 font-bold truncate max-w-[220px]" title={esc.nomeModeloFinal || "-"}>
                                            {esc.nomeModeloFinal || "-"}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            {esc.temRvtOriginal === 1 ? (
                                                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                                                    OK
                                                </Badge>
                                            ) : (
                                                <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-200">
                                                    Pendente
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                className={`text-[10px] font-bold px-2 py-0.5 border flex items-center gap-1.5 w-fit ${statusInfo.color}`}
                                            >
                                                <StatusIcon className="w-3 h-3 shrink-0" />
                                                <span>{statusInfo.label}</span>
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedEscopo(esc)}
                                                className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-red-50 hover:text-[#9C1915] text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 mx-auto"
                                                title="Ver histórico de entregas vinculadas a este modelo"
                                            >
                                                <History className="w-3 h-3 text-slate-500" />
                                                <span>{esc.totalEntregas || 0} SMs</span>
                                            </button>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-[#9C1915] hover:bg-red-50 rounded-md"
                                                    onClick={() => {
                                                        setEditingEscopo(esc);
                                                        setIsEscopoFormOpen(true);
                                                    }}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                                    onClick={() => {
                                                        if (confirm("Deseja realmente remover este modelo do escopo?")) {
                                                            deleteMutation.mutate({ id: esc.id });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal de Formulário de Escopo */}
            {isEscopoFormOpen && (
                <ScopeFormModal
                    onClose={() => setIsEscopoFormOpen(false)}
                    escopo={editingEscopo}
                    projectId={projectId}
                />
            )}
        </div>
    );
}
