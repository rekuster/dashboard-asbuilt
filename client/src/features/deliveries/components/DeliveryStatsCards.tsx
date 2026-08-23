import React from "react";
import { CheckCircle2, AlertTriangle, CopyCheck, Clock, FileSpreadsheet } from "lucide-react";

interface DeliveryStatsCardsProps {
    stats: {
        total?: number;
        aguardando?: number;
        recebidos?: number;
        validados?: number;
        comPendencias?: number;
        igualProjeto?: number;
        rejeitados?: number;
    } | null | undefined;
}

export function DeliveryStatsCards({ stats }: DeliveryStatsCardsProps) {
    const totalModelos = stats?.total || 110;
    const totalEntregas = stats?.recebidos || 0;
    const validados = stats?.validados || 0;
    const pendencias = stats?.comPendencias || (stats?.rejeitados ? stats.rejeitados : 0);
    const igualProjeto = stats?.igualProjeto || 0;
    const naoEntregues = stats?.aguardando || Math.max(0, totalModelos - validados);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* 1. TOTAL MODELOS */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Modelos Escopo</span>
                    <span className="text-2xl font-black text-slate-900">{totalModelos}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Inventário Mestre</span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                </div>
            </div>

            {/* 2. VALIDADOS */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Validados</span>
                    <span className="text-2xl font-black text-emerald-700">{validados}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Conforme Execução</span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
            </div>

            {/* 3. COM PENDÊNCIAS */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Com Pendências</span>
                    <span className="text-2xl font-black text-amber-700">{pendencias}</span>
                    <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Ajustes Parciais</span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                </div>
            </div>

            {/* 4. IGUAL AO PROJETO */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Igual ao Projeto</span>
                    <span className="text-2xl font-black text-[#9C1915]">{igualProjeto}</span>
                    <span className="text-[10px] text-red-600 font-semibold block mt-0.5">Sem As-Built Real</span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center">
                    <CopyCheck className="w-4 h-4" />
                </div>
            </div>

            {/* 5. LOG DE REMESSAS RECEBIDAS */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Remessas Recebidas</span>
                    <span className="text-2xl font-black text-slate-800">{totalEntregas}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Logs de SMs</span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
