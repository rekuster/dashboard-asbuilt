import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Camera, Trash2, X, Plus } from "lucide-react";
import { DISCIPLINA_LABELS } from "../constants";

interface InspectionFormProps {
    selectedSala: any;
    disciplina: string;
    onDisciplinaChange: (d: string) => void;
    divergencia: string;
    onDivergenciaChange: (d: string) => void;
    fotoRAPreview: string | null;
    onPhotoChange: (type: "RA" | "Real", e: React.ChangeEvent<HTMLInputElement>) => void;
    onPhotoDrop: (type: "RA" | "Real", e: React.DragEvent<HTMLDivElement>) => void;
    onClearPhoto: (type: "RA" | "Real") => void;
    fotoRealPreview: string | null;
    onAddToList: () => void;
    onCancelSala: () => void;
}

export function InspectionForm({
    selectedSala,
    disciplina,
    onDisciplinaChange,
    divergencia,
    onDivergenciaChange,
    fotoRAPreview,
    onPhotoChange,
    onPhotoDrop,
    onClearPhoto,
    fotoRealPreview,
    onAddToList,
    onCancelSala,
}: InspectionFormProps) {
    return (
        <Card className="shadow-md border-t-4 border-t-[#940707] rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/60 pb-4 border-b border-slate-100">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-[#940707]" />
                            Adicionar Apontamento
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-0.5 font-medium">
                            Registrando em:{" "}
                            <strong className="text-slate-800">{selectedSala.nome}</strong> (
                            {selectedSala.edificacao} • {selectedSala.pavimento})
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-slate-400 hover:text-slate-600"
                        onClick={onCancelSala}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Disciplina</Label>
                    <select
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#940707]/20 outline-none"
                        value={disciplina}
                        onChange={(e) => onDisciplinaChange(e.target.value)}
                    >
                        <option value="">Selecione a disciplina...</option>
                        {Object.entries(DISCIPLINA_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">
                        Divergência / Apontamento
                    </Label>
                    <Textarea
                        placeholder="Descreva o problema encontrado em campo..."
                        className="min-h-[100px] rounded-xl border-slate-200 resize-none text-xs leading-relaxed"
                        value={divergencia}
                        onChange={(e) => onDivergenciaChange(e.target.value)}
                    />
                </div>

                {/* Upload de Fotos (Referência e Real) */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Foto Referência (RA) */}
                    <div
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onPhotoDrop("RA", e)}
                    >
                        <div className="text-[10px] font-black text-center uppercase tracking-widest text-slate-500 mb-2">
                            Foto RA / Referência
                        </div>
                        {fotoRAPreview ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center group">
                                <img
                                    src={fotoRAPreview}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Referência"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => onClearPhoto("RA")}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer py-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center mb-1.5 text-slate-600">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600">
                                    Adicionar Foto
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => onPhotoChange("RA", e)}
                                />
                            </label>
                        )}
                    </div>

                    {/* Foto Real (Obra) */}
                    <div
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onPhotoDrop("Real", e)}
                    >
                        <div className="text-[10px] font-black text-center uppercase tracking-widest text-[#940707] mb-2">
                            Foto Real / Obra
                        </div>
                        {fotoRealPreview ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center group">
                                <img
                                    src={fotoRealPreview}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Real"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => onClearPhoto("Real")}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer py-3">
                                <div className="w-10 h-10 rounded-full bg-[#940707]/10 flex items-center justify-center mb-1.5 text-[#940707]">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600">
                                    Adicionar Foto
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => onPhotoChange("Real", e)}
                                />
                            </label>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        onClick={onAddToList}
                        className="w-full h-11 rounded-full bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold gap-2 shadow-lg shadow-[#940707]/20"
                    >
                        <Plus className="w-4 h-4" /> Incluir na Lista da Sala
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
