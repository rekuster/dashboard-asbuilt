import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DataHubFiltersProps {
    search: string;
    onSearchChange: (val: string) => void;
    filterEdificacao: string;
    onEdificacaoChange: (val: string) => void;
    edificacoes: string[];
    filterPavimento: string;
    onPavimentoChange: (val: string) => void;
    pavimentos: string[];
    filterDisciplina?: string;
    onDisciplinaChange?: (val: string) => void;
    disciplinas?: string[];
    filterStatus?: string;
    onStatusChange?: (val: string) => void;
    showDisciplineFilter?: boolean;
}

export function DataHubFilters({
    search,
    onSearchChange,
    filterEdificacao,
    onEdificacaoChange,
    edificacoes,
    filterPavimento,
    onPavimentoChange,
    pavimentos,
    filterDisciplina,
    onDisciplinaChange,
    disciplinas = [],
    filterStatus,
    onStatusChange,
    showDisciplineFilter = false,
}: DataHubFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Buscar sala, setor..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-9 rounded-full bg-white/70 border-slate-200 text-xs"
                />
            </div>

            <Select value={filterEdificacao} onValueChange={onEdificacaoChange}>
                <SelectTrigger className="w-[150px] h-9 rounded-full bg-white/70 border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="Edificação" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todas">Todas Edificações</SelectItem>
                    {edificacoes.map((ed) => (
                        <SelectItem key={ed} value={ed}>
                            {ed}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filterPavimento} onValueChange={onPavimentoChange}>
                <SelectTrigger className="w-[140px] h-9 rounded-full bg-white/70 border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="Pavimento" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todos">Todos Pavimentos</SelectItem>
                    {pavimentos.map((pav) => (
                        <SelectItem key={pav} value={pav}>
                            {pav}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {showDisciplineFilter && onDisciplinaChange && (
                <Select value={filterDisciplina || "Todas"} onValueChange={onDisciplinaChange}>
                    <SelectTrigger className="w-[140px] h-9 rounded-full bg-white/70 border-slate-200 text-xs font-bold">
                        <SelectValue placeholder="Disciplina" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todas">Todas Disciplinas</SelectItem>
                        {disciplinas.map((disc) => (
                            <SelectItem key={disc} value={disc}>
                                {disc}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {filterStatus && onStatusChange && (
                <Select value={filterStatus} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-[130px] h-9 rounded-full bg-white/70 border-slate-200 text-xs font-bold">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todos">Todos Status</SelectItem>
                        <SelectItem value="VERIFICADA">Verificada</SelectItem>
                        <SelectItem value="REVISAR">Revisar</SelectItem>
                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
