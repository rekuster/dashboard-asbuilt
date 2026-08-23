import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building2, Layers, MapPin, CalendarDays } from "lucide-react";

interface FieldReportHeaderProps {
    edificacoes: string[];
    selectedEdificacao: string;
    onSelectEdificacao: (ed: string) => void;
    pavimentos: string[];
    selectedPavimento: string;
    onSelectPavimento: (pav: string) => void;
    salas: any[];
    selectedSala: any;
    onSelectSala: (sala: any) => void;
    dataVerificacao: string;
    onDataVerificacaoChange: (date: string) => void;
}

export function FieldReportHeader({
    edificacoes,
    selectedEdificacao,
    onSelectEdificacao,
    pavimentos,
    selectedPavimento,
    onSelectPavimento,
    salas,
    selectedSala,
    onSelectSala,
    dataVerificacao,
    onDataVerificacaoChange,
}: FieldReportHeaderProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Edificação */}
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#9C1915]" />
                        Edificação
                    </Label>
                    <select
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C1915]"
                        value={selectedEdificacao}
                        onChange={(e) => onSelectEdificacao(e.target.value)}
                    >
                        <option value="">Selecione a edificação...</option>
                        {edificacoes.map((ed) => (
                            <option key={ed} value={ed}>
                                {ed}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Pavimento */}
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#9C1915]" />
                        Pavimento
                    </Label>
                    <select
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C1915] disabled:opacity-50"
                        value={selectedPavimento}
                        onChange={(e) => onSelectPavimento(e.target.value)}
                        disabled={!selectedEdificacao}
                    >
                        <option value="">Selecione o pavimento...</option>
                        {pavimentos.map((pav) => (
                            <option key={pav} value={pav}>
                                {pav}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sala */}
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#9C1915]" />
                        Sala / Ambiente
                    </Label>
                    <select
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9C1915] disabled:opacity-50"
                        value={selectedSala ? String(selectedSala.id) : ""}
                        onChange={(e) => {
                            const found = salas.find((s) => String(s.id) === e.target.value);
                            onSelectSala(found || null);
                        }}
                        disabled={!selectedPavimento}
                    >
                        <option value="">Selecione a sala...</option>
                        {salas.map((s) => (
                            <option key={s.id} value={String(s.id)}>
                                {s.nome} {s.numeroSala ? `(Nº ${s.numeroSala})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Data Verificação */}
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-[#9C1915]" />
                        Data da Inspeção
                    </Label>
                    <Input
                        type="date"
                        className="h-8 rounded-lg border-slate-200 text-xs font-semibold"
                        value={dataVerificacao}
                        onChange={(e) => onDataVerificacaoChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
