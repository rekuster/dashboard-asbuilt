import React from "react";
import {
    CheckCircle2,
    AlertTriangle,
    CopyCheck,
    Clock,
    FileSpreadsheet,
    FileCheck2,
} from "lucide-react";

interface DeliveryStatsCardsProps {
    stats:
        | {
              total?: number;
              aguardando?: number;
              recebidos?: number;
              validados?: number;
              emRevisao?: number;
              comPendencias?: number;
              igualProjeto?: number;
              rejeitados?: number;
              totalPranchas?: number;
              pranchasValidadas?: number;
              totalPacotes?: number;
          }
        | null
        | undefined;
}

export function DeliveryStatsCards({ stats }: DeliveryStatsCardsProps) {
    const totalModelos = stats?.total || 110;
    const totalEntregas = stats?.recebidos || 0;
    const totalPacotes = stats?.totalPacotes || 0;
    const validados = stats?.validados || 0;
    const pendencias = stats?.emRevisao ?? stats?.comPendencias ?? 0;
    const igualProjeto = stats?.igualProjeto ?? stats?.rejeitados ?? 0;
    const naoEntregues = stats?.aguardando ?? Math.max(0, totalModelos - validados - pendencias - igualProjeto);
    const totalPranchas = stats?.totalPranchas || 0;
    const pranchasValidadas = stats?.pranchasValidadas || 0;
    const pranchasPct =
        totalPranchas > 0 ? Math.round((pranchasValidadas / totalPranchas) * 100) : 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. TOTAL MODELOS */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Modelos (Lista Mestra)
                    </span>
                    <span className="text-2xl font-black text-slate-900">{totalModelos}</span>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                        {naoEntregues} não entregues
                    </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                </div>
            </div>

            {/* 2. VALIDADOS */}
            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                        Modelos Validados
                    </span>
                    <span className="text-2xl font-black text-emerald-700">{validados}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                        {totalModelos > 0 ? ((validados / totalModelos) * 100).toFixed(1) : 0}% do escopo
                    </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
            </div>

            {/* 3. COM PENDÊNCIAS */}
            <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">
                        Com Pendências
                    </span>
                    <span className="text-2xl font-black text-amber-700">{pendencias}</span>
                    <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                        Validar / Retornar
                    </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                </div>
            </div>

            {/* 4. IGUAL AO PROJETO */}
            <div className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-[#9C1915] block">
                        Igual ao Projeto
                    </span>
                    <span className="text-2xl font-black text-[#9C1915]">{igualProjeto}</span>
                    <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                        Sem As-Built Real
                    </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-red-50 text-[#9C1915] flex items-center justify-center shrink-0">
                    <CopyCheck className="w-4 h-4" />
                </div>
            </div>

            {/* 5. PRANCHAS 2D (DWG / PDF) */}
            <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-blue-800 block">
                        Pranchas 2D (DWG/PDF)
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-700">
                            {pranchasValidadas}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                            / {totalPranchas}
                        </span>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                        {pranchasPct}% doc. validada
                    </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                </div>
            </div>

            {/* 6. CICLOS QUINZENAIS (SMs) */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Ciclos Quinzenais
                    </span>
                    <span className="text-2xl font-black text-slate-800">
                        {totalPacotes || totalEntregas}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                        {totalEntregas} arq. em SMs
                    </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
