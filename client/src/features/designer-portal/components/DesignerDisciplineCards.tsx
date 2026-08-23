import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronRight, CheckCircle2, Clock, AlertCircle, Building2, Layers } from "lucide-react";
import { toast } from "sonner";

interface DisciplineCardData {
    sigla: string;
    displayName: string;
    responsavel: string;
    totalSalas: number;
    totalApontamentos: number;
    ativas: number;
    emRevisao: number;
    sanadas: number;
    taxaResolucao: number;
    bcfFileUrl?: string | null;
}

interface DesignerDisciplineCardsProps {
    disciplines: DisciplineCardData[];
    onSelectDiscipline: (sigla: string) => void;
    isAdmin?: boolean;
    selectedCompany: string;
    onCompanyChange: (company: string) => void;
    companiesList: string[];
    selectedEdificacao: string;
    onEdificacaoChange: (edificacao: string) => void;
    edificacoesList: string[];
}

export function DesignerDisciplineCards({
    disciplines,
    onSelectDiscipline,
    isAdmin,
    selectedCompany,
    onCompanyChange,
    companiesList,
    selectedEdificacao,
    onEdificacaoChange,
    edificacoesList,
}: DesignerDisciplineCardsProps) {
    const handleDownloadBcf = (e: React.MouseEvent, disc: DisciplineCardData) => {
        e.stopPropagation();
        if (disc.bcfFileUrl) {
            window.open(disc.bcfFileUrl, "_blank");
            toast.success(`Baixando BCF oficial de ${disc.sigla}...`);
        } else {
            toast.warning(
                `Arquivo .bcf de ${disc.sigla} (${disc.displayName}) ainda não foi carregado pela Stecla para esta edificação.`
            );
        }
    };

    // Estatísticas Globais do Projetista (Apenas Em Revisão + Sanadas)
    const totalIssues = disciplines.reduce((acc, d) => acc + d.totalApontamentos, 0);
    const totalRevisao = disciplines.reduce((acc, d) => acc + d.emRevisao, 0);
    const totalSanadas = disciplines.reduce((acc, d) => acc + d.sanadas, 0);
    const globalRate = totalIssues > 0 ? Math.round((totalSanadas / totalIssues) * 100) : 100;

    return (
        <div className="space-y-4">
            {/* Top Toolbar: Filtro de Edificação & Empresa */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-7 bg-[#9C1915] rounded-xs" />
                    <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Portal As-Built • Backlog de Ajustes Verificados
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                            Apontamentos verificados no Navisworks com arquivo BCF liberado para modelagem As-Built.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filtro de Edificação */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">
                            Edificação:
                        </span>
                        <select
                            value={selectedEdificacao}
                            onChange={(e) => onEdificacaoChange(e.target.value)}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-7 text-slate-800 focus:outline-none focus:border-[#9C1915]"
                        >
                            <option value="todas">Todas as Edificações</option>
                            {edificacoesList.map((ed) => (
                                <option key={ed} value={ed}>
                                    {ed}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro de Empresa (para Admin) */}
                    {isAdmin && (
                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5 ml-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">
                                Empresa:
                            </span>
                            <select
                                value={selectedCompany}
                                onChange={(e) => onCompanyChange(e.target.value)}
                                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-7 text-slate-800 focus:outline-none focus:border-[#9C1915]"
                            >
                                <option value="todas">Todas ({companiesList.length})</option>
                                {companiesList.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards Rápidos do Projetista */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-amber-600">Aguardando Correção no Modelo</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xl font-black text-amber-600 mt-1">{totalRevisao}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Apontamentos verificados c/ BCF</div>
                </Card>

                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-600">Sanadas / Aprovadas</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-black text-emerald-600 mt-1">{totalSanadas}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Modelagem 3D validada no As-Built</div>
                </Card>

                <Card className="border border-slate-200 bg-white rounded-xl shadow-xs p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-700">Taxa de Resolução</span>
                        <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-xl font-black text-slate-800 mt-1">{globalRate}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{totalIssues} apontamentos no total</div>
                </Card>
            </div>

            {/* Grid de Cards de Disciplinas */}
            {disciplines.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs italic">
                    Nenhum apontamento verificado com pendência de ajuste para os filtros selecionados.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {disciplines.map((disc) => (
                        <div
                            key={disc.sigla}
                            onClick={() => onSelectDiscipline(disc.sigla)}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:shadow-md hover:border-[#9C1915]/30 transition-all cursor-pointer flex flex-col justify-between group"
                        >
                            <div className="space-y-3">
                                {/* Header do Card */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs bg-red-50 text-[#9C1915] border border-red-200 px-2 py-0.5 rounded">
                                            {disc.sigla}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-xs text-slate-800 group-hover:text-[#9C1915] transition-colors leading-tight">
                                                {disc.displayName}
                                            </h3>
                                            <span className="text-[10px] font-semibold text-slate-500">
                                                Resp: {disc.responsavel || "Stecla"}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                        {disc.totalSalas} salas
                                    </span>
                                </div>

                                {/* Barra de Progresso */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">Resolução As-Built</span>
                                        <span className="text-slate-800">{disc.taxaResolucao}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-emerald-500 h-full transition-all"
                                            style={{ width: `${(disc.sanadas / (disc.totalApontamentos || 1)) * 100}%` }}
                                            title={`Sanadas: ${disc.sanadas}`}
                                        />
                                        <div
                                            className="bg-amber-400 h-full transition-all"
                                            style={{ width: `${(disc.emRevisao / (disc.totalApontamentos || 1)) * 100}%` }}
                                            title={`Em Revisão: ${disc.emRevisao}`}
                                        />
                                    </div>
                                </div>

                                {/* Contadores de Status */}
                                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                                    <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2">
                                        <div className="text-[9px] font-bold uppercase text-amber-700">Ajustar As Built</div>
                                        <div className="text-sm font-black text-amber-700">{disc.emRevisao}</div>
                                    </div>
                                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2">
                                        <div className="text-[9px] font-bold uppercase text-emerald-700">Sanadas / OK</div>
                                        <div className="text-sm font-black text-emerald-700">{disc.sanadas}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Ações do Card */}
                            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => handleDownloadBcf(e, disc)}
                                    className="h-7 px-2 text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                                >
                                    <Download className="w-3 h-3 text-[#9C1915]" />
                                    Baixar BCF Oficial
                                </Button>

                                <span className="text-[11px] font-bold text-[#9C1915] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                    Ver Salas
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
