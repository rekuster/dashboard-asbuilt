import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DeliveryStatsCards } from "./components/DeliveryStatsCards";
import { ScopeListView } from "./components/ScopeListView";
import { EntregaDetailView } from "./components/EntregaDetailView";
import { DeliveryFormModal } from "./components/DeliveryFormModal";

export default function EntregasTab({
    projectId,
    selectedEdificacao,
}: {
    projectId: string;
    selectedEdificacao?: string;
}) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<any>(null);
    const [viewingDetail, setViewingDetail] = useState<any>(null);

    const utils = trpc.useUtils();
    const { data: entregas = [] } = trpc.dashboard.getEntregas.useQuery({
        projectId,
    });
    const { data: stats } = trpc.dashboard.getEntregasStats.useQuery({
        projectId,
        edificacao: selectedEdificacao,
    });

    const deleteMutation = trpc.dashboard.deleteEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getEscopos.invalidate({ projectId });
        },
    });

    const handleEdit = (entrega: any) => {
        setEditingEntrega(entrega);
        setIsFormOpen(true);
    };

    const handleViewDetail = (entrega: any) => {
        setViewingDetail(entrega);
    };

    const handleDelete = async (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm("Deseja realmente excluir esta entrega?")) {
            await deleteMutation.mutateAsync({ id });
            if (viewingDetail?.id === id) setViewingDetail(null);
        }
    };

    return (
        <div className="space-y-3.5 font-sans pb-12 animate-in fade-in duration-150">
            {viewingDetail ? (
                <EntregaDetailView
                    projectId={projectId}
                    entrega={viewingDetail}
                    onBack={() => setViewingDetail(null)}
                    onUpdate={() => {
                        utils.dashboard.getEntregas.invalidate({ projectId });
                        utils.dashboard.getEntregasStats.invalidate({ projectId });
                        utils.dashboard.getEscopos.invalidate({ projectId });
                    }}
                    onEdit={() => handleEdit(viewingDetail)}
                    onDelete={() => handleDelete(viewingDetail.id)}
                />
            ) : (
                <>
                    {/* 4 KPI Cards no padrão oficial KPICard do sistema */}
                    <DeliveryStatsCards stats={stats} />

                    {/* Nível 1: Cards por Empresa (Ocle, Thá, AeB) -> Nível 2: Relação de Modelos e Pacotes da Empresa */}
                    <ScopeListView
                        projectId={projectId}
                        entregas={entregas}
                        selectedEdificacao={selectedEdificacao}
                        onViewEntrega={handleViewDetail}
                        onDeleteEntrega={handleDelete}
                        onEditEntrega={handleEdit}
                    />

                    {isFormOpen && (
                        <DeliveryFormModal
                            onClose={() => setIsFormOpen(false)}
                            entrega={editingEntrega}
                            projectId={projectId}
                        />
                    )}
                </>
            )}
        </div>
    );
}
