import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Image as ImageIcon, Layout, Pencil, X } from "lucide-react";
import { format } from "date-fns";

interface IssuesMasterTableProps {
    apontamentos: any[];
    onUpdateApontamento: (data: any) => void;
    onDeleteApontamento: (id: number, numero: number) => void;
    onEditClick: (item: any) => void;
}

export function IssuesMasterTable({
    apontamentos,
    onUpdateApontamento,
    onDeleteApontamento,
    onEditClick,
}: IssuesMasterTableProps) {
    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50/80">
                    <TableRow className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <TableHead className="w-[80px]">Data/Nº</TableHead>
                        <TableHead>Edificação</TableHead>
                        <TableHead>Pavimento</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Sala</TableHead>
                        <TableHead className="w-[110px]">Disc.</TableHead>
                        <TableHead className="w-[120px]">Responsável</TableHead>
                        <TableHead className="w-[30%]">Divergência</TableHead>
                        <TableHead className="text-center w-[120px]">Evidências</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {apontamentos.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 text-xs">
                            <TableCell>
                                <div className="font-bold text-[#940707]">#{item.numeroApontamento}</div>
                                <div className="text-[10px] text-slate-400">
                                    {item.data ? format(new Date(item.data), "dd/MM/yy") : "—"}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">{item.edificacao}</TableCell>
                            <TableCell className="text-slate-600">{item.pavimento}</TableCell>
                            <TableCell className="text-slate-500 font-bold">{item.setor}</TableCell>
                            <TableCell className="font-bold text-slate-800">{item.sala}</TableCell>
                            <TableCell>
                                <Input
                                    className="h-7 text-xs rounded-lg border-slate-200"
                                    defaultValue={item.disciplina}
                                    onBlur={(e) => {
                                        if (e.target.value !== item.disciplina) {
                                            onUpdateApontamento({ id: item.id, disciplina: e.target.value });
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <select
                                    className={`h-7 px-2 rounded-lg text-[10px] font-bold border ${
                                        item.responsavel === "Thá"
                                            ? "bg-red-50 text-red-600 border-red-200"
                                            : "bg-blue-50 text-blue-600 border-blue-200"
                                    }`}
                                    value={item.responsavel || "Ocle"}
                                    onChange={(e) =>
                                        onUpdateApontamento({ id: item.id, responsavel: e.target.value })
                                    }
                                >
                                    <option value="Thá">Thá</option>
                                    <option value="Ocle">Ocle</option>
                                    <option value="Stecla">Stecla</option>
                                    <option value="Instaladora">Instaladora</option>
                                </select>
                            </TableCell>
                            <TableCell>
                                <Input
                                    className="h-7 text-xs rounded-lg border-slate-200"
                                    defaultValue={item.divergencia || ""}
                                    onBlur={(e) => {
                                        if (e.target.value !== (item.divergencia || "")) {
                                            onUpdateApontamento({ id: item.id, divergencia: e.target.value });
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="flex gap-1 justify-center items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title={`Editar #${item.numeroApontamento}`}
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                        onClick={() => onEditClick(item)}
                                    >
                                        <Pencil size={13} />
                                    </Button>

                                    {/* Model Photo (Referencia) */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-7 w-7 rounded-full ${
                                                    item.fotoReferenciaUrl ? "text-blue-600 bg-blue-50" : "text-slate-300"
                                                }`}
                                                title="Foto Modelo"
                                            >
                                                <Layout size={13} />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl">
                                            <ImageUpload
                                                bucketName="project-assets"
                                                folderPath="apontamentos/referencias"
                                                label="Foto Modelo / Referência"
                                                onUploadComplete={(url: string) =>
                                                    onUpdateApontamento({ id: item.id, fotoReferenciaUrl: url })
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    {/* Real Photo (Obra) */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-7 w-7 rounded-full ${
                                                    item.fotoUrl ? "text-rose-600 bg-rose-50" : "text-slate-300"
                                                }`}
                                                title="Foto Obra"
                                            >
                                                <ImageIcon size={13} />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl">
                                            <ImageUpload
                                                bucketName="project-assets"
                                                folderPath="apontamentos/real"
                                                label="Foto Real / Campo"
                                                onUploadComplete={(url: string) =>
                                                    onUpdateApontamento({ id: item.id, fotoUrl: url })
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title={`Excluir #${item.numeroApontamento}`}
                                        className="h-7 w-7 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                        onClick={() => onDeleteApontamento(item.id, item.numeroApontamento)}
                                    >
                                        <X size={13} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
