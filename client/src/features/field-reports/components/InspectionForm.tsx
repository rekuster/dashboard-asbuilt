import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Camera, Trash2, X, Plus, Send, Loader2 } from "lucide-react";
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
    onSaveDirect: () => void;
    isSavingDirect: boolean;
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
    onSaveDirect,
    isSavingDirect,
    onAddToList,
    onCancelSala,
}: InspectionFormProps) {
    const isFormValid = !!disciplina && !!divergencia.trim();

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {/* Header Padronizado Stecla */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center">
                        <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Adicionar Apontamento
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            Registrando em: <strong className="text-slate-800">{selectedSala.nome}</strong> ({selectedSala.edificacao} • {selectedSala.pavimento})
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCancelSala}
                    className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                    title="Fechar sala selecionada"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
                {/* Disciplina */}
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">
                        Disciplina *
                    </Label>
                    <select
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-[#9C1915] outline-none"
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

                {/* Divergência / Apontamento */}
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">
                        Divergência / Apontamento *
                    </Label>
                    <Textarea
                        placeholder="Descreva o problema encontrado em campo..."
                        className="min-h-[80px] rounded-lg border-slate-200 resize-none text-xs leading-relaxed"
                        value={divergencia}
                        onChange={(e) => onDivergenciaChange(e.target.value)}
                    />
                </div>

                {/* Upload de Fotos (Referência e Real) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Foto Referência (RA) */}
                    <div
                        className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onPhotoDrop("RA", e)}
                    >
                        <div className="text-[10px] font-bold text-center uppercase tracking-wider text-slate-600 mb-1.5">
                            Foto RA / Referência
                        </div>
                        {fotoRAPreview ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center group">
                                <img
                                    src={fotoRAPreview}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Referência"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="h-7 w-7 rounded-md"
                                        onClick={() => onClearPhoto("RA")}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer py-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1 text-slate-600">
                                    <Camera className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600">
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
                        className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onPhotoDrop("Real", e)}
                    >
                        <div className="text-[10px] font-bold text-center uppercase tracking-wider text-[#9C1915] mb-1.5">
                            Foto Real / Obra
                        </div>
                        {fotoRealPreview ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center group">
                                <img
                                    src={fotoRealPreview}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Real"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="h-7 w-7 rounded-md"
                                        onClick={() => onClearPhoto("Real")}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer py-2">
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-1 text-[#9C1915]">
                                    <Camera className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600">
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

                {/* Botões de Ação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <Button
                        type="button"
                        onClick={onSaveDirect}
                        disabled={!isFormValid || isSavingDirect}
                        className="w-full h-8 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                        {isSavingDirect ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" /> Salvar Apontamento
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={onAddToList}
                        disabled={!isFormValid || isSavingDirect}
                        className="w-full h-8 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" /> Adicionar ao Lote
                    </Button>
                </div>
            </div>
        </div>
    );
}
