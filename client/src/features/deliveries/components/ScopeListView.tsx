import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Layers,
    Plus,
    Edit2,
    Trash2,
    Search,
    History,
    FileSpreadsheet,
    CalendarCheck2,
    ShieldCheck,
    MessageSquareWarning,
    CheckSquare,
    Square,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TimelineParciais } from "./TimelineParciais";
import { ScopeFormModal } from "./ScopeFormModal";
import { ModelValidationModal } from "./ModelValidationModal";
import { QuinzenaBatchModal } from "./QuinzenaBatchModal";
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
    const [selectedEscopoTimeline, setSelectedEscopoTimeline] = useState<any>(null);
    const [validatingEscopo, setValidatingEscopo] = useState<any>(null);
    const [isEscopoFormOpen, setIsEscopoFormOpen] = useState(false);
    const [editingEscopo, setEditingEscopo] = useState<any>(null);
    const [isQuinzenaModalOpen, setIsQuinzenaModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterEmpresa, setFilterEmpresa] = useState("todas");
    const [filterDisciplina, setFilterDisciplina] = useState("todas");
    const [filterStatus, setFilterStatus] = useState("todos");

    const { data: escopos = [], isLoading: loadingEscopos } =
        trpc.dashboard.getEscopos.useQuery({ projectId });
    const utils = trpc.useUtils();

    const invalidateAll = () => {
        utils.dashboard.getEscopos.invalidate({ projectId });
        utils.dashboard.getEntregas.invalidate({ projectId });
        utils.dashboard.getEntregasStats.invalidate({ projectId });
        utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
        utils.analytics.getAsBuiltModelsSummary.invalidate({ projectId });
    };

    const deleteMutation = trpc.dashboard.deleteEscopo.useMutation({
        onSuccess: invalidateAll,
    });

    const quickUpdateMutation = trpc.dashboard.quickUpdateEscopo.useMutation({
        onSuccess: invalidateAll,
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
                (e.empresa || "").toLowerCase().includes(q) ||
                (e.parecerTecnico || "").toLowerCase().includes(q);

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

    const selectedEscopoObjects = useMemo(
        () => escopos.filter((e: any) => selectedIds.includes(e.id)),
        [escopos, selectedIds]
    );

    const toggleSelectAll = () => {
        const visibleIds = filteredEscopos.map((e: any) => e.id);
        const allSelected =
            visibleIds.length > 0 && visibleIds.every((id: number) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const toggleSelectRow = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    if (selectedEscopoTimeline) {
        return (
            <TimelineParciais
                escopo={selectedEscopoTimeline}
                onBack={() => setSelectedEscopoTimeline(null)}
                onViewEntrega={onViewEntrega}
            />
        );
    }

    const allVisibleSelected =
        filteredEscopos.length > 0 &&
        filteredEscopos.every((e: any) => selectedIds.includes(e.id));

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header + Filtros */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                        <h3
                            id="master-list-table-heading"
                            className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"
                        >
                            <Layers className="w-4 h-4 text-[#9C1915]" />
                            Lista Mestra de Modelos 3D & Pranchas 2D ({filteredEscopos.length} de {escopos.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Valide modelos 3D, pranchas 2D (.dwg/.pdf) e pareceres técnicos direto na linha ou selecione modelos para check-in quinzenal (SM).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                size="sm"
                                onClick={() => setIsQuinzenaModalOpen(true)}
                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs animate-in fade-in"
                            >
                                <CalendarCheck2 className="w-3.5 h-3.5" />
                                Registrar Quinzena ({selectedIds.length} selecionados)
                            </Button>
                        )}

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

                {/* Barra de Filtros */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Buscar modelo, disciplina, parecer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 text-xs h-8 rounded-lg border-slate-200 bg-white"
                        />
                    </div>

                    <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                        <SelectTrigger className="w-[140px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
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
                        <SelectTrigger className="w-[150px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
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
                        <SelectTrigger className="w-[155px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                            <SelectValue placeholder="Status 3D" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos" className="text-xs font-bold">
                                Todos Status 3D
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
                </div>
            </div>

            {/* Tabela de Escopo de Modelos com suporte acessível a teclado e cabeçalho fixo */}
            <div
                className="overflow-x-auto max-h-[640px] focus:outline-2 focus:outline-[#9C1915]/40"
                tabIndex={0}
                role="region"
                aria-labelledby="master-list-table-heading"
            >
                <Table className="border-separate border-spacing-0">
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-2xs">
                        <TableRow className="hover:bg-transparent border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <TableHead className="w-10 text-center border-b border-slate-200 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    className="text-slate-500 hover:text-slate-800 flex items-center justify-center mx-auto"
                                    title="Selecionar todos os modelos filtrados para entrega quinzenal"
                                >
                                    {allVisibleSelected ? (
                                        <CheckSquare className="w-4 h-4 text-[#9C1915]" />
                                    ) : (
                                        <Square className="w-4 h-4" />
                                    )}
                                </button>
                            </TableHead>
                            <TableHead className="w-20 border-b border-slate-200 bg-slate-50">Empresa</TableHead>
                            <TableHead className="w-36 border-b border-slate-200 bg-slate-50">Edificação</TableHead>
                            <TableHead className="w-44 border-b border-slate-200 bg-slate-50">Disciplina & Modelo</TableHead>
                            <TableHead className="w-20 text-center border-b border-slate-200 bg-slate-50">RVT Nativo</TableHead>
                            <TableHead className="w-36 text-center border-b border-slate-200 bg-slate-50">Doc 2D (DWG/PDF)</TableHead>
                            <TableHead className="w-44 border-b border-slate-200 bg-slate-50">Status Modelo 3D</TableHead>
                            <TableHead className="border-b border-slate-200 bg-slate-50">Parecer Técnico / Pendências</TableHead>
                            <TableHead className="w-24 text-center border-b border-slate-200 bg-slate-50">Quinzenas</TableHead>
                            <TableHead className="w-24 text-right border-b border-slate-200 bg-slate-50">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingEscopos ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs italic">
                                    Carregando Lista Mestra de Modelos As-Built...
                                </TableCell>
                            </TableRow>
                        ) : filteredEscopos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs italic">
                                    Nenhum modelo encontrado para os filtros selecionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEscopos.map((esc: any) => {
                                const statusKey = esc.statusAuditoria || "NAO_ENTREGUE";
                                const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS["NAO_ENTREGUE"];
                                const isChecked = selectedIds.includes(esc.id);

                                const totalPranchas = esc.totalPranchas ?? 0;
                                const pranchasValidadas = esc.pranchasValidadas ?? 0;
                                const statusPranchas = esc.statusPranchas || "NAO_ENTREGUE";

                                const empLower = (esc.empresa || "").toLowerCase();
                                const empBadgeClass =
                                    empLower === "thá" || empLower === "tha"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : empLower === "aeb"
                                        ? "bg-teal-50 text-teal-700 border-teal-200"
                                        : "bg-purple-50 text-purple-700 border-purple-200";

                                return (
                                    <TableRow
                                        key={esc.id}
                                        className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs ${
                                            isChecked ? "bg-red-50/30" : ""
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <TableCell className="text-center border-b border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => toggleSelectRow(esc.id)}
                                                className="text-slate-400 hover:text-slate-700 flex items-center justify-center mx-auto"
                                            >
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-[#9C1915]" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </TableCell>

                                        {/* Empresa */}
                                        <TableCell className="border-b border-slate-100">
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-bold px-2 py-0.5 ${empBadgeClass}`}
                                            >
                                                {esc.empresa}
                                            </Badge>
                                        </TableCell>

                                        {/* Edificação */}
                                        <TableCell className="font-semibold text-slate-800 border-b border-slate-100">
                                            {esc.edificacao}
                                        </TableCell>

                                        {/* Disciplina + Modelo */}
                                        <TableCell className="border-b border-slate-100">
                                            <div className="font-bold text-slate-900">{esc.disciplina}</div>
                                            <div
                                                className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]"
                                                title={esc.nomeModeloFinal || esc.nomeModelo}
                                            >
                                                {esc.nomeModeloFinal || esc.nomeModelo}
                                            </div>
                                        </TableCell>

                                        {/* RVT Base (Toggle 1 clique) */}
                                        <TableCell className="text-center border-b border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    quickUpdateMutation.mutate({
                                                        id: esc.id,
                                                        temRvtOriginal: esc.temRvtOriginal === 1 ? 0 : 1,
                                                    })
                                                }
                                                title="Clique para alternar disponibilidade do RVT Nativo"
                                            >
                                                {esc.temRvtOriginal === 1 ? (
                                                    <Badge className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold hover:bg-emerald-100 cursor-pointer">
                                                        RVT OK
                                                    </Badge>
                                                ) : (
                                                    <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 cursor-pointer">
                                                        Sem RVT
                                                    </Badge>
                                                )}
                                            </button>
                                        </TableCell>

                                        {/* Documentação 2D (DWG / PDF) */}
                                        <TableCell className="text-center border-b border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setValidatingEscopo(esc)}
                                                className="inline-flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all"
                                                title="Clique para validar pranchas DWG/PDF deste modelo"
                                            >
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                                                    <FileSpreadsheet className="w-3 h-3 text-[#9C1915]" />
                                                    <span>
                                                        {pranchasValidadas}/{totalPranchas} pranchas
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[9px] font-bold uppercase ${
                                                        statusPranchas === "VALIDADO" ||
                                                        (totalPranchas > 0 && pranchasValidadas >= totalPranchas)
                                                            ? "text-emerald-600"
                                                            : statusPranchas === "COM_PENDENCIAS" || pranchasValidadas > 0
                                                            ? "text-amber-600"
                                                            : "text-slate-400"
                                                    }`}
                                                >
                                                    {statusPranchas === "VALIDADO"
                                                        ? "2D Validado"
                                                        : statusPranchas === "COM_PENDENCIAS"
                                                        ? "2D c/ Pendência"
                                                        : "2D Pendente"}
                                                </span>
                                            </button>
                                        </TableCell>

                                        {/* Status Auditoria 3D com troca rápida em 1 clique */}
                                        <TableCell className="border-b border-slate-100">
                                            <select
                                                value={statusKey}
                                                onChange={(e) =>
                                                    quickUpdateMutation.mutate({
                                                        id: esc.id,
                                                        statusModelo: e.target.value,
                                                    })
                                                }
                                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${statusInfo.color}`}
                                                aria-label={`Status 3D de ${esc.disciplina} - ${esc.edificacao}`}
                                            >
                                                <option value="VALIDADO" className="bg-white text-emerald-700 font-bold">
                                                    🟩 Validado
                                                </option>
                                                <option value="COM_PENDENCIAS" className="bg-white text-amber-700 font-bold">
                                                    🟨 Com Pendências
                                                </option>
                                                <option value="IGUAL_PROJETO" className="bg-white text-[#9C1915] font-bold">
                                                    🟥 Igual ao Projeto
                                                </option>
                                                <option value="NAO_ENTREGUE" className="bg-white text-slate-600 font-bold">
                                                    ⬜ Não Entregue
                                                </option>
                                            </select>
                                        </TableCell>

                                        {/* Parecer Técnico / Apontamentos */}
                                        <TableCell className="border-b border-slate-100 max-w-[260px]">
                                            <button
                                                type="button"
                                                onClick={() => setValidatingEscopo(esc)}
                                                className="text-left w-full group"
                                                title="Clique para editar o parecer técnico e apontamentos"
                                            >
                                                {esc.parecerTecnico ? (
                                                    <div className="flex items-start gap-1.5 text-[11px] text-slate-700 group-hover:text-slate-950 line-clamp-2">
                                                        <MessageSquareWarning className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                                        <span>{esc.parecerTecnico}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic group-hover:text-[#9C1915] transition-colors">
                                                        + Adicionar parecer / apontamentos...
                                                    </span>
                                                )}
                                            </button>
                                        </TableCell>

                                        {/* Histórico de Remessas (SMs) */}
                                        <TableCell className="text-center border-b border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedEscopoTimeline(esc)}
                                                className="text-[11px] font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 hover:text-[#9C1915] text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 mx-auto"
                                                title="Ver linha do tempo de entregas quinzenais (SMs) deste modelo"
                                            >
                                                <History className="w-3 h-3 text-slate-500" />
                                                <span>{esc.totalEntregas || 0} SMs</span>
                                            </button>
                                        </TableCell>

                                        {/* Ações */}
                                        <TableCell className="text-right border-b border-slate-100">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Validar Modelo 3D + Pranchas 2D + Parecer"
                                                    className="h-7 w-7 text-[#9C1915] hover:bg-red-50 rounded-md"
                                                    onClick={() => setValidatingEscopo(esc)}
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Editar dados cadastrais do modelo"
                                                    className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
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
                                                    title="Remover do escopo"
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

            {/* Modal Rápido de Validação 3D + 2D + Parecer */}
            {validatingEscopo && (
                <ModelValidationModal
                    projectId={projectId}
                    escopo={validatingEscopo}
                    onClose={() => setValidatingEscopo(null)}
                />
            )}

            {/* Modal de Check-in Quinzenal em Lote (SMs) */}
            {isQuinzenaModalOpen && (
                <QuinzenaBatchModal
                    projectId={projectId}
                    selectedEscopos={selectedEscopoObjects}
                    onClose={() => setIsQuinzenaModalOpen(false)}
                    onSuccess={() => setSelectedIds([])}
                />
            )}

            {/* Modal de Formulário Cadastral de Escopo */}
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
