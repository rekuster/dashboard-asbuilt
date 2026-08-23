import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Eye,
    CheckCircle2,
    Clock,
    AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IssuesTableProps {
    issues: any[];
    isLoading: boolean;
    isAdmin: boolean;
    isEditor: boolean;
    canChangeStatus: (issue: any) => boolean;
    onUpdateStatus: (id: number, status: string) => void;
    onUpdatePriority: (id: number, priority: string) => void;
    onEditClick: (issue: any) => void;
    onDeleteClick?: (id: number) => void;
}

export function IssuesTable({
    issues,
    isLoading,
    isAdmin,
    isEditor,
    canChangeStatus,
    onUpdateStatus,
    onUpdatePriority,
    onEditClick,
    onDeleteClick,
}: IssuesTableProps) {
    return (
        <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-left text-xs border-collapse">
                    {/* Stecla Red Header matching brand guideline and reference */}
                    <TableHeader className="bg-[#9C1915]">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-12 text-center text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3">
                                #
                            </TableHead>
                            <TableHead className="w-16 text-center text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-2">
                                Foto
                            </TableHead>
                            <TableHead className="text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3">
                                Localização / Disciplina
                            </TableHead>
                            <TableHead className="text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3">
                                Divergência Identificada
                            </TableHead>
                            <TableHead className="w-28 text-center text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3">
                                Status
                            </TableHead>
                            <TableHead className="w-24 text-center text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3">
                                Prioridade
                            </TableHead>
                            <TableHead className="w-32 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3">
                                Responsável
                            </TableHead>
                            <TableHead className="w-14 text-center text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-2">
                                Ações
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-32 text-center text-slate-400 italic text-xs"
                                >
                                    Carregando apontamentos...
                                </TableCell>
                            </TableRow>
                        ) : issues.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-32 text-center text-slate-400 italic text-xs"
                                >
                                    Nenhum apontamento encontrado com os filtros ativos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            issues.map((issue: any, index: number) => {
                                const isSanada =
                                    issue.status === "SANADA" ||
                                    issue.status === "RESOLVIDA";
                                const isEmRevisao =
                                    issue.status === "EM_REVISAO" ||
                                    issue.status === "SOLICITADO";

                                return (
                                    <tr
                                        key={issue.id}
                                        className="hover:bg-slate-50/80 transition-colors"
                                    >
                                        {/* ID */}
                                        <td className="py-2 px-3 text-center font-mono text-[11px] font-bold text-slate-500">
                                            #{issue.numeroApontamento || index + 1}
                                        </td>

                                        {/* Thumbnail */}
                                        <td className="py-2 px-2 text-center">
                                            {issue.fotoUrl ? (
                                                <a
                                                    href={issue.fotoUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-block"
                                                >
                                                    <img
                                                        src={issue.fotoUrl}
                                                        alt="Divergência"
                                                        className="w-9 h-9 rounded object-cover border border-slate-200 hover:scale-110 transition-transform"
                                                    />
                                                </a>
                                            ) : issue.fotoReferenciaUrl ? (
                                                <a
                                                    href={issue.fotoReferenciaUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-block"
                                                >
                                                    <img
                                                        src={issue.fotoReferenciaUrl}
                                                        alt="Snapshot Modelo"
                                                        className="w-9 h-9 rounded object-cover border border-slate-200 hover:scale-110 transition-transform"
                                                    />
                                                </a>
                                            ) : (
                                                <div className="w-9 h-9 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[9px] font-bold mx-auto">
                                                    S/ Foto
                                                </div>
                                            )}
                                        </td>

                                        {/* Localização & Disciplina */}
                                        <td className="py-2 px-3">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-[#9C1915] text-xs">
                                                        {issue.disciplina}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-[#575756] font-medium">
                                                    {issue.edificacao} • {issue.pavimento} • {issue.sala}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Descrição */}
                                        <td className="py-2 px-3 text-slate-800 font-normal max-w-sm">
                                            <p className="line-clamp-2 leading-relaxed">
                                                {issue.divergencia || "Sem descrição"}
                                            </p>
                                        </td>

                                        {/* Status */}
                                        <td className="py-2 px-3 text-center">
                                            {canChangeStatus(issue) ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                                                isSanada
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                    : isEmRevisao
                                                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                    : "bg-red-50 text-[#9C1915] border-red-200 hover:bg-red-100"
                                                            }`}
                                                        >
                                                            {isSanada
                                                                ? "Sanada"
                                                                : isEmRevisao
                                                                ? "Em Revisão"
                                                                : "Ativa"}
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="center" className="text-xs">
                                                        <DropdownMenuItem
                                                            onClick={() => onUpdateStatus(issue.id, "ATIVA")}
                                                        >
                                                            Ativa
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => onUpdateStatus(issue.id, "EM_REVISAO")}
                                                        >
                                                            Em Revisão
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => onUpdateStatus(issue.id, "SANADA")}
                                                        >
                                                            Sanada / Resolvida
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : (
                                                <span
                                                    className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                        isSanada
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : isEmRevisao
                                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                                            : "bg-red-50 text-[#9C1915] border-red-200"
                                                    }`}
                                                >
                                                    {isSanada
                                                        ? "Sanada"
                                                        : isEmRevisao
                                                        ? "Em Revisão"
                                                        : "Ativa"}
                                                </span>
                                            )}
                                        </td>

                                        {/* Prioridade */}
                                        <td className="py-2 px-3 text-center">
                                            <span className="text-[10px] font-bold text-[#575756] uppercase">
                                                {issue.prioridade || "Normal"}
                                            </span>
                                        </td>

                                        {/* Responsável */}
                                        <td className="py-2 px-3">
                                            <span className="text-[11px] font-medium text-slate-700 truncate block">
                                                {issue.responsavel || "Não Definido"}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="py-2 px-2 text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded"
                                                    >
                                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="text-xs">
                                                    {(isAdmin || isEditor) && (
                                                        <DropdownMenuItem
                                                            onClick={() => onEditClick(issue)}
                                                            className="gap-2"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                    )}
                                                    {isAdmin && onDeleteClick && (
                                                        <DropdownMenuItem
                                                            onClick={() => onDeleteClick(issue.id)}
                                                            className="gap-2 text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
