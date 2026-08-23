import React from "react";
import KPICard from "@/components/dashboard/KPICard";
import { AlertCircle, Clock, CheckCircle2, Layers } from "lucide-react";

interface IssueKPICardsProps {
    stats: {
        total: number;
        active: number;
        revision: number;
        resolved: number;
        qualityRate: number;
    };
}

export function IssueKPICards({ stats }: IssueKPICardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
                title="Total de Apontamentos"
                value={stats.total}
                subtitle="Registrados em campo"
                icon={Layers}
            />
            <KPICard
                title="Divergências Ativas"
                value={stats.active}
                subtitle="Aguardando correção"
                icon={AlertCircle}
                variant="red"
            />
            <KPICard
                title="Em Revisão"
                value={stats.revision}
                subtitle="Modelagem em validação"
                icon={Clock}
            />
            <KPICard
                title="Sanadas / Aprovadas"
                value={stats.resolved}
                subtitle={`${stats.qualityRate.toFixed(1)}% taxa de resolução`}
                icon={CheckCircle2}
            />
        </div>
    );
}
