import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface RoomMappingTableProps {
    salas: any[];
    onUpdateSala: (data: any) => void;
}

export function RoomMappingTable({ salas, onUpdateSala }: RoomMappingTableProps) {
    const handleCheckboxChange = (id: number, field: string, currentValue: number | null | undefined) => {
        const nextValue = currentValue === 1 ? 0 : 1;
        onUpdateSala({ id, [field]: nextValue });
    };

    return (
        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50/80">
                    <TableRow className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <TableHead className="w-[60px]">Nº</TableHead>
                        <TableHead>Edificação</TableHead>
                        <TableHead>Pavimento</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="w-[200px]">Sala</TableHead>
                        <TableHead className="text-center">Planta</TableHead>
                        <TableHead className="text-center">Augin</TableHead>
                        <TableHead className="text-center">Tracker</TableHead>
                        <TableHead className="text-center">QR Code</TableHead>
                        <TableHead className="text-center">Forro</TableHead>
                        <TableHead className="text-center">Status RA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {salas.map((sala) => {
                        const isLiberado =
                            (sala.statusRA || "").toUpperCase().includes("LIBERADO") ||
                            (sala.augin === 1 &&
                                sala.trackerPosicionado === 1 &&
                                sala.qrCodePlastificado === 1);

                        return (
                            <TableRow key={sala.id} className="hover:bg-slate-50/50 text-xs">
                                <TableCell className="font-mono text-slate-400">
                                    {sala.numeroSala}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                    {sala.edificacao}
                                </TableCell>
                                <TableCell className="text-slate-600">{sala.pavimento}</TableCell>
                                <TableCell className="text-slate-500">{sala.setor}</TableCell>
                                <TableCell className="font-bold text-slate-800">
                                    {sala.nome}
                                </TableCell>

                                {/* Planta Upload / Popover */}
                                <TableCell className="text-center">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-7 w-7 p-0 rounded-full ${
                                                    sala.imagemPlantaUrl
                                                        ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                        : "text-slate-300 hover:text-slate-500"
                                                }`}
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        Planta: {sala.nome}
                                                    </span>
                                                    {sala.imagemPlantaUrl && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-[10px] text-rose-500 hover:text-rose-700"
                                                            onClick={() =>
                                                                onUpdateSala({
                                                                    id: sala.id,
                                                                    imagemPlantaUrl: null,
                                                                })
                                                            }
                                                        >
                                                            <X className="w-3 h-3 mr-1" /> Remover
                                                        </Button>
                                                    )}
                                                </div>

                                                {sala.imagemPlantaUrl ? (
                                                    <div className="rounded-xl overflow-hidden border border-slate-100 aspect-video bg-slate-50">
                                                        <img
                                                            src={sala.imagemPlantaUrl}
                                                            alt={`Planta ${sala.nome}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <ImageUpload
                                                        bucketName="project-assets"
                                                        folderPath="plantas"
                                                        label="Enviar foto da planta"
                                                        onUploadComplete={(url: string) =>
                                                            onUpdateSala({
                                                                id: sala.id,
                                                                imagemPlantaUrl: url,
                                                            })
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </TableCell>

                                {/* Checklist Checkboxes */}
                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={sala.augin === 1}
                                        onCheckedChange={() =>
                                            handleCheckboxChange(sala.id, "augin", sala.augin)
                                        }
                                    />
                                </TableCell>

                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={sala.trackerPosicionado === 1}
                                        onCheckedChange={() =>
                                            handleCheckboxChange(
                                                sala.id,
                                                "trackerPosicionado",
                                                sala.trackerPosicionado
                                            )
                                        }
                                    />
                                </TableCell>

                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={sala.qrCodePlastificado === 1}
                                        onCheckedChange={() =>
                                            handleCheckboxChange(
                                                sala.id,
                                                "qrCodePlastificado",
                                                sala.qrCodePlastificado
                                            )
                                        }
                                    />
                                </TableCell>

                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={sala.temForro === 1}
                                        onCheckedChange={() =>
                                            handleCheckboxChange(sala.id, "temForro", sala.temForro)
                                        }
                                    />
                                </TableCell>

                                {/* Status RA Badge */}
                                <TableCell className="text-center">
                                    <Badge
                                        variant="outline"
                                        className={`text-[9px] font-black rounded-full px-2 py-0.5 ${
                                            isLiberado
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-50 text-slate-400 border-slate-200"
                                        }`}
                                    >
                                        {isLiberado ? "LIBERADO" : "PENDENTE"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
