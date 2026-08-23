import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Briefcase, Trash2 } from "lucide-react";
import { STATUS_LABELS } from "../constants";

interface PacketsListViewProps {
    entregas: any[];
    onViewDetail: (e: any) => void;
    onDelete: (id: number, e: any) => void;
}

export function PacketsListView({ entregas, onViewDetail, onDelete }: PacketsListViewProps) {
    const packets = useMemo(() => {
        const groups: Record<string, any[]> = {};
        entregas.forEach((e) => {
            const id = e.identificadorEntrega || "Sem Identificação";
            if (!groups[id]) groups[id] = [];
            groups[id].push(e);
        });
        return Object.entries(groups).sort((a, b) => b[1][0].id - a[1][0].id);
    }, [entregas]);

    if (packets.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic">
                Nenhum pacote encontrado.
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-2">
            {packets.map(([name, items]) => {
                const statusCount = items.reduce((acc: any, item: any) => {
                    acc[item.status] = (acc[item.status] || 0) + 1;
                    return acc;
                }, {});

                return (
                    <Card
                        key={name}
                        className="border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group/card"
                    >
                        <CardHeader className="py-3 px-5 bg-slate-50/80 flex flex-row items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm group-hover/card:border-primary/30 transition-colors">
                                    <Briefcase className="w-4 h-4 text-[#940707]" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                        {name}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        {items.length} {items.length === 1 ? "modelo" : "modelos"} •{" "}
                                        {items[0].empresaResponsavel}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {Object.entries(statusCount).map(([status, count]) => {
                                    const info = STATUS_LABELS[status] || STATUS_LABELS["AGUARDANDO"];
                                    return (
                                        <Badge
                                            key={status}
                                            variant="outline"
                                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${info.color}`}
                                        >
                                            {count as any} {info.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableBody>
                                    {items.map((item) => {
                                        const statusInfo =
                                            STATUS_LABELS[item.status] || STATUS_LABELS["AGUARDANDO"];
                                        const StatusIcon = statusInfo.icon;
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-slate-50/30 cursor-pointer h-12 group/row transition-colors border-slate-50"
                                                onClick={() => onViewDetail(item)}
                                            >
                                                <TableCell className="pl-6 text-[11px] font-bold text-slate-700 w-[35%]">
                                                    <div className="flex flex-col">
                                                        <span>{item.nomeDocumento}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            Ref: {item.modeloBaseReferencia || "N/A"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-slate-500 font-bold uppercase">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                                                            {item.disciplina}
                                                        </span>
                                                        <span>{item.edificacao}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div
                                                        className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase flex items-center gap-1 w-fit ${statusInfo.color}`}
                                                    >
                                                        <StatusIcon className="w-2.5 h-2.5" />
                                                        {statusInfo.label}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(item.id, e);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
