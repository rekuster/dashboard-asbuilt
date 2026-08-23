import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface RoomStatusTableProps {
    salas: any[];
    onUpdateSala: (data: any) => void;
}

export function RoomStatusTable({ salas, onUpdateSala }: RoomStatusTableProps) {
    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50/80">
                    <TableRow className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <TableHead>Edificação</TableHead>
                        <TableHead>Pavimento</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="w-[180px]">Sala</TableHead>
                        <TableHead className="whitespace-nowrap">Data Verif.</TableHead>
                        <TableHead className="text-center">Faltou?</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead className="whitespace-nowrap">Data 2</TableHead>
                        <TableHead>Obs 2</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {salas.map((sala) => (
                        <TableRow key={sala.id} className="hover:bg-slate-50/50 text-xs">
                            <TableCell className="font-medium text-slate-700">{sala.edificacao}</TableCell>
                            <TableCell className="text-slate-600">{sala.pavimento}</TableCell>
                            <TableCell className="text-slate-500 font-bold">{sala.setor}</TableCell>
                            <TableCell>
                                <div className="font-bold text-slate-800">{sala.nome}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Nº {sala.numeroSala}</div>
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="date"
                                    className="h-7 text-[10px] w-28 p-1 rounded-lg border-slate-200"
                                    value={
                                        sala.dataVerificada
                                            ? new Date(sala.dataVerificada).toISOString().split("T")[0]
                                            : ""
                                    }
                                    onChange={(e) =>
                                        onUpdateSala({
                                            id: sala.id,
                                            dataVerificada: e.target.value ? new Date(e.target.value) : null,
                                        })
                                    }
                                />
                            </TableCell>
                            <TableCell className="text-center">
                                <Checkbox
                                    checked={sala.faltouDisciplina === "Sim"}
                                    onCheckedChange={(checked) =>
                                        onUpdateSala({
                                            id: sala.id,
                                            faltouDisciplina: checked ? "Sim" : "Não",
                                        })
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    className="h-7 text-xs min-w-[120px] rounded-lg border-slate-200"
                                    defaultValue={sala.obs || ""}
                                    onBlur={(e) => {
                                        if (e.target.value !== (sala.obs || "")) {
                                            onUpdateSala({ id: sala.id, obs: e.target.value });
                                        }
                                    }}
                                    placeholder="Nota..."
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="date"
                                    className="h-7 text-[10px] w-28 p-1 rounded-lg border-slate-200"
                                    value={
                                        sala.dataVerificacao2
                                            ? new Date(sala.dataVerificacao2).toISOString().split("T")[0]
                                            : ""
                                    }
                                    onChange={(e) =>
                                        onUpdateSala({
                                            id: sala.id,
                                            dataVerificacao2: e.target.value ? new Date(e.target.value) : null,
                                        })
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    className="h-7 text-xs min-w-[120px] rounded-lg border-slate-200"
                                    defaultValue={sala.obs2 || ""}
                                    onBlur={(e) => {
                                        if (e.target.value !== (sala.obs2 || "")) {
                                            onUpdateSala({ id: sala.id, obs2: e.target.value });
                                        }
                                    }}
                                    placeholder="Obs 2..."
                                />
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={`text-[9px] font-black rounded-full px-2 py-0.5 ${
                                        sala.status === "VERIFICADA"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : sala.status === "REVISAR"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-slate-50 text-slate-400 border-slate-200"
                                    }`}
                                >
                                    {sala.status || "PENDENTE"}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
