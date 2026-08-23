import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Edit2, Trash2, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { STATUS_LABELS, DELIVERY_STATUS_OPTIONS, DOC_TYPES } from "../constants";

interface DocumentsListViewProps {
    entregas: any[];
    isLoading: boolean;
    sortConfig: {
        key: "numeroEntrega" | "dataRecebimento" | "status" | null;
        direction: "asc" | "desc";
    };
    onSort: (key: "numeroEntrega" | "dataRecebimento" | "status") => void;
    onViewDetail: (e: any) => void;
    onEdit: (e: any) => void;
    onDelete: (id: number, e: React.MouseEvent) => void;
    onStatusChange: (entrega: any, newStatus: string) => void;
    isUpdatingStatus: boolean;
    updatingId?: number;
}

export function DocumentsListView({
    entregas,
    isLoading,
    sortConfig,
    onSort,
    onViewDetail,
    onEdit,
    onDelete,
    onStatusChange,
    isUpdatingStatus,
    updatingId,
}: DocumentsListViewProps) {
    return (
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-slate-200 uppercase text-[10px] font-bold tracking-wider text-slate-500">
                    <TableHead
                        className="w-[60px] cursor-pointer hover:text-[#9C1915] transition-colors group"
                        onClick={() => onSort("numeroEntrega")}
                    >
                        <div className="flex items-center gap-1">
                            Nº
                            <ArrowUpDown
                                className={`w-3 h-3 transition-opacity ${
                                    sortConfig.key === "numeroEntrega"
                                        ? "opacity-100 text-[#9C1915]"
                                        : "opacity-30 group-hover:opacity-100"
                                }`}
                            />
                        </div>
                    </TableHead>
                    <TableHead
                        className="w-[120px] cursor-pointer hover:text-[#9C1915] transition-colors group"
                        onClick={() => onSort("dataRecebimento")}
                    >
                        <div className="flex items-center gap-1">
                            Data Entrega
                            <ArrowUpDown
                                className={`w-3 h-3 transition-opacity ${
                                    sortConfig.key === "dataRecebimento"
                                        ? "opacity-100 text-[#9C1915]"
                                        : "opacity-30 group-hover:opacity-100"
                                }`}
                            />
                        </div>
                    </TableHead>
                    <TableHead className="w-[150px]">Pacote / SM</TableHead>
                    <TableHead className="w-[90px]">Empresa</TableHead>
                    <TableHead className="w-[130px]">Edificação</TableHead>
                    <TableHead className="w-[140px]">Disciplina</TableHead>
                    <TableHead>Documento Entregue</TableHead>
                    <TableHead className="w-[80px]">Formato</TableHead>
                    <TableHead
                        className="w-[170px] cursor-pointer hover:text-[#9C1915] transition-colors group"
                        onClick={() => onSort("status")}
                    >
                        <div className="flex items-center gap-1">
                            Status da Remessa
                            <ArrowUpDown
                                className={`w-3 h-3 transition-opacity ${
                                    sortConfig.key === "status"
                                        ? "opacity-100 text-[#9C1915]"
                                        : "opacity-30 group-hover:opacity-100"
                                }`}
                            />
                        </div>
                    </TableHead>
                    <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs italic">
                            Carregando remessas de entregas...
                        </TableCell>
                    </TableRow>
                ) : entregas.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs italic">
                            Nenhuma entrega encontrada.
                        </TableCell>
                    </TableRow>
                ) : (
                    entregas.map((entrega: any) => {
                        const statusKey = entrega.status || "COM_PENDENCIAS";
                        const statusInfo =
                            STATUS_LABELS[statusKey] || STATUS_LABELS["COM_PENDENCIAS"];

                        return (
                            <TableRow
                                key={entrega.id}
                                className="hover:bg-slate-50/70 transition-colors border-slate-100 group cursor-pointer text-xs"
                                onClick={() => onViewDetail(entrega)}
                            >
                                <TableCell className="font-bold text-slate-400 text-[11px]">
                                    #{entrega.numeroEntrega || entrega.id}
                                </TableCell>
                                <TableCell className="font-semibold text-slate-700 text-[11px]">
                                    {entrega.dataRecebimento
                                        ? dayjs(entrega.dataRecebimento).format("DD/MM/YYYY")
                                        : "-"}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] font-bold text-[#9C1915] truncate max-w-[150px]" title={entrega.identificadorEntrega || "-"}>
                                    {entrega.identificadorEntrega || "-"}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={`text-[9px] font-bold px-1.5 py-0 ${
                                            entrega.empresaResponsavel?.toLowerCase() === "thá" || entrega.empresaResponsavel?.toLowerCase() === "tha"
                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                : "bg-purple-50 text-purple-700 border-purple-200"
                                        }`}
                                    >
                                        {entrega.empresaResponsavel || "-"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-semibold text-slate-800 text-[11px]">
                                    {entrega.edificacao}
                                </TableCell>
                                <TableCell className="font-semibold text-slate-800 text-[11px]">
                                    {entrega.disciplina}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] text-slate-800 truncate max-w-[240px]" title={entrega.nomeDocumento}>
                                    {entrega.nomeDocumento}
                                </TableCell>
                                <TableCell className="uppercase text-[10px] font-bold text-slate-500">
                                    {entrega.formato || entrega.tipoDocumento || "-"}
                                </TableCell>
                                <TableCell>
                                    <div
                                        className="w-fit"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Select
                                            value={
                                                DELIVERY_STATUS_OPTIONS.some(o => o.value === entrega.status)
                                                    ? entrega.status
                                                    : "COM_PENDENCIAS"
                                            }
                                            onValueChange={(val) =>
                                                onStatusChange(entrega, val)
                                            }
                                            disabled={
                                                isUpdatingStatus &&
                                                updatingId === entrega.id
                                            }
                                        >
                                            <SelectTrigger
                                                className={`h-6.5 min-w-[130px] rounded-md border text-[9px] font-black uppercase px-2 flex items-center gap-1 hover:brightness-95 transition-all ${statusInfo.color}`}
                                            >
                                                {isUpdatingStatus &&
                                                updatingId === entrega.id ? (
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                ) : null}
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DELIVERY_STATUS_OPTIONS.map((opt) => {
                                                    const Icon = opt.icon;
                                                    return (
                                                        <SelectItem
                                                            key={opt.value}
                                                            value={opt.value}
                                                            className="text-[10px] font-bold uppercase py-1.5"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="w-3.5 h-3.5" />
                                                                {opt.label}
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-400 hover:text-[#9C1915] hover:bg-red-50 rounded-md"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(entrega);
                                            }}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                            onClick={(e) => onDelete(entrega.id, e)}
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
    );
}
