import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Edificação */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#940707]" />
                            Edificação
                        </Label>
                        <select
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#940707]/20"
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
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#940707]" />
                            Pavimento
                        </Label>
                        <select
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#940707]/20 disabled:opacity-50"
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
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#940707]" />
                            Sala / Ambiente
                        </Label>
                        <select
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#940707]/20 disabled:opacity-50"
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
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[#940707]" />
                            Data da Inspeção
                        </Label>
                        <Input
                            type="date"
                            className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                            value={dataVerificacao}
                            onChange={(e) => onDataVerificacaoChange(e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
