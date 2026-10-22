import React from "react";
import KPICard from "@/components/dashboard/KPICard";
import { Layers, CheckCircle2, AlertCircle, FileText } from "lucide-react";

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
    const totalModelos = stats?.total || 0;
    const validados = stats?.validados || 0;
    const pendencias = stats?.emRevisao ?? stats?.comPendencias ?? 0;
    const igualProjeto = stats?.igualProjeto ?? stats?.rejeitados ?? 0;
    const naoEntregues =
        stats?.aguardando ??
        Math.max(0, totalModelos - validados - pendencias - igualProjeto);

    const totalPranchas = stats?.totalPranchas || 0;
    const pranchasValidadas = stats?.pranchasValidadas || 0;
    const pranchasPct =
        totalPranchas > 0 ? Math.round((pranchasValidadas / totalPranchas) * 100) : 0;

    const taxaValidacao =
        totalModelos > 0 ? ((validados / totalModelos) * 100).toFixed(1) : "0.0";

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
                title="Total de Modelos (Escopo)"
                value={totalModelos}
                subtitle={`${naoEntregues} aguardando 1ª entrega`}
                icon={Layers}
            />
            <KPICard
                title="Em Revisão / Com Pendências"
                value={pendencias + igualProjeto}
                subtitle={
                    igualProjeto > 0
                        ? `${pendencias} c/ pendências • ${igualProjeto} igual projeto`
                        : "Modelos em validação / ajuste"
                }
                icon={AlertCircle}
                variant="red"
            />
            <KPICard
                title="Documentação 2D (DWG/PDF)"
                value={`${pranchasValidadas} / ${totalPranchas}`}
                subtitle={`${pranchasPct}% das pranchas validadas`}
                icon={FileText}
            />
            <KPICard
                title="Modelos Validados"
                value={validados}
                subtitle={`${taxaValidacao}% do escopo aprovado`}
                icon={CheckCircle2}
            />
        </div>
    );
}
