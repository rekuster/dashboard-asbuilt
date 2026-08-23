import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    FileText,
    History,
    Layers,
} from "lucide-react";
import { STATUS_LABELS } from "./constants";
import { DeliveryStatsCards } from "./components/DeliveryStatsCards";
import { DocumentsListView } from "./components/DocumentsListView";
import { PacketsListView } from "./components/PacketsListView";
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
    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<any>(null);
    const [viewingDetail, setViewingDetail] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>("scope"); // Default to Escopo Matriz
    const [viewMode, setViewMode] = useState<"table" | "packets">("table");

    const [filterEmpresa, setFilterEmpresa] = useState("todas");
    const [filterPacote, setFilterPacote] = useState("todos");
    const [filterStatus, setFilterStatus] = useState("todos");

    const [sortConfig, setSortConfig] = useState<{
        key: "numeroEntrega" | "dataRecebimento" | "status" | null;
        direction: "asc" | "desc";
    }>({
        key: "dataRecebimento",
        direction: "desc",
    });

    const handleSort = (key: "numeroEntrega" | "dataRecebimento" | "status") => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const utils = trpc.useUtils();
    const { data: entregas = [], isLoading } = trpc.dashboard.getEntregas.useQuery({
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
        },
    });

    const updateStatusMutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            utils.dashboard.getAsBuiltStatus.invalidate({ projectId });
            utils.dashboard.getEscopos.invalidate({ projectId });
        },
    });

    const handleStatusChange = async (entrega: any, newStatus: string) => {
        try {
            await updateStatusMutation.mutateAsync({
                ...entrega,
                status: newStatus,
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Falha ao atualizar status da entrega.");
        }
    };

    const filteredEntregas = useMemo(() => {
        return entregas
            .filter((e: any) => {
                const matchesEdif =
                    !selectedEdificacao ||
                    e.edificacao?.toLowerCase().includes(selectedEdificacao.toLowerCase());
                const matchesSearch =
                    !searchTerm ||
                    (e.nomeDocumento || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (e.empresaResponsavel || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (e.identificadorEntrega || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (e.disciplina || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());

                const emp =
                    e.empresaResponsavel?.toUpperCase() === "OCLE"
                        ? "Ocle"
                        : e.empresaResponsavel;
                const matchesEmpresa =
                    filterEmpresa === "todas" ||
                    emp?.toLowerCase() === filterEmpresa.toLowerCase();
                const matchesPacote =
                    filterPacote === "todos" || e.identificadorEntrega === filterPacote;
                const matchesStatus =
                    filterStatus === "todos" || e.status === filterStatus;

                return (
                    matchesEdif &&
                    matchesSearch &&
                    matchesEmpresa &&
                    matchesPacote &&
                    matchesStatus
                );
            })
            .sort((a: any, b: any) => {
                if (sortConfig.key) {
                    let valA = a[sortConfig.key];
                    let valB = b[sortConfig.key];

                    if (sortConfig.key === "dataRecebimento") {
                        valA = valA ? new Date(valA).getTime() : 0;
                        valB = valB ? new Date(valB).getTime() : 0;
                    }

                    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
                }

                const dateA = a.dataRecebimento
                    ? new Date(a.dataRecebimento).getTime()
                    : 0;
                const dateB = b.dataRecebimento
                    ? new Date(b.dataRecebimento).getTime()
                    : 0;
                if (dateA !== dateB) return dateB - dateA;
                return (b.numeroEntrega || 0) - (a.numeroEntrega || 0);
            });
    }, [
        entregas,
        searchTerm,
        selectedEdificacao,
        filterEmpresa,
        filterPacote,
        filterStatus,
        sortConfig,
    ]);

    const empresasUnicas = useMemo(() => {
        const empresas = new Set(
            entregas
                .map((e: any) => {
                    if (e.empresaResponsavel?.toUpperCase() === "OCLE") return "Ocle";
                    return e.empresaResponsavel;
                })
                .filter(Boolean)
        );
        return Array.from(empresas).sort();
    }, [entregas]);

    const pacotesUnicos = useMemo(() => {
        const pacotes = new Set(
            entregas.map((e: any) => e.identificadorEntrega).filter(Boolean)
        );
        return Array.from(pacotes).sort();
    }, [entregas]);

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
        <div className="space-y-4 font-sans animate-in fade-in duration-200">
            {viewingDetail ? (
                <EntregaDetailView
                    projectId={projectId}
                    entrega={viewingDetail}
                    onBack={() => setViewingDetail(null)}
                    onUpdate={() => {
                        utils.dashboard.getEntregas.invalidate({ projectId });
                        utils.dashboard.getEntregasStats.invalidate({ projectId });
                    }}
                    onEdit={() => handleEdit(viewingDetail)}
                    onDelete={() => handleDelete(viewingDetail.id)}
                />
            ) : (
                <>
                    {/* 5 KPI Cards Stecla */}
                    <DeliveryStatsCards stats={stats} />

                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full space-y-4"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <TabsList className="bg-slate-100 p-1 rounded-lg">
                                <TabsTrigger
                                    value="scope"
                                    className="rounded-md data-[state=active]:bg-[#9C1915] data-[state=active]:text-white text-xs font-bold gap-1.5"
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    Matriz de Escopo As-Built (110 Modelos)
                                </TabsTrigger>
                                <TabsTrigger
                                    value="list"
                                    className="rounded-md data-[state=active]:bg-[#9C1915] data-[state=active]:text-white text-xs font-bold gap-1.5"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Histórico de Entregas & Remessas ({entregas.length})
                                </TabsTrigger>
                            </TabsList>

                            {activeTab === "list" && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`rounded-md h-7 px-2.5 text-xs font-bold ${
                                                viewMode === "table"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-900"
                                            }`}
                                            onClick={() => setViewMode("table")}
                                        >
                                            <FileText className="w-3 h-3 mr-1" />
                                            Tabela
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`rounded-md h-7 px-2.5 text-xs font-bold ${
                                                viewMode === "packets"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-900"
                                            }`}
                                            onClick={() => setViewMode("packets")}
                                        >
                                            <Layers className="w-3 h-3 mr-1" />
                                            Por Pacote (SM)
                                        </Button>
                                    </div>

                                    <Button
                                        size="sm"
                                        className="h-8 px-3 rounded-lg bg-[#9C1915] hover:bg-[#7D1411] text-white text-xs font-bold gap-1.5 shadow-xs"
                                        onClick={() => {
                                            setEditingEntrega(null);
                                            setIsFormOpen(true);
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Nova Entrega
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* TAB 1: ESCOPO DE MODELOS */}
                        <TabsContent value="scope" className="m-0 focus-visible:outline-none">
                            <ScopeListView
                                projectId={projectId}
                                entregas={entregas}
                                selectedEdificacao={selectedEdificacao}
                                onViewEntrega={handleViewDetail}
                            />
                        </TabsContent>

                        {/* TAB 2: HISTÓRICO DE ENTREGAS */}
                        <TabsContent value="list" className="m-0 focus-visible:outline-none">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-[#9C1915]" />
                                            Logs de Entregas & Remessas ({filteredEntregas.length} de {entregas.length})
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            Registro cronológico de arquivos, formatos e validações parciais recebidas.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative w-full sm:w-56">
                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            <Input
                                                type="text"
                                                placeholder="Buscar documento, empresa..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-8 text-xs h-8 rounded-lg border-slate-200 bg-white"
                                            />
                                        </div>

                                        <Select
                                            value={filterEmpresa}
                                            onValueChange={setFilterEmpresa}
                                        >
                                            <SelectTrigger className="w-[130px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                                                <SelectValue placeholder="Empresa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todas" className="text-xs font-bold">
                                                    Todas Empresas
                                                </SelectItem>
                                                {empresasUnicas.map((emp: any) => (
                                                    <SelectItem key={emp} value={emp} className="text-xs">
                                                        {emp}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={filterPacote}
                                            onValueChange={setFilterPacote}
                                        >
                                            <SelectTrigger className="w-[150px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                                                <SelectValue placeholder="Pacote / SM" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos" className="text-xs font-bold">
                                                    Todos Pacotes
                                                </SelectItem>
                                                {pacotesUnicos.map((p: any) => (
                                                    <SelectItem key={p} value={p} className="text-xs">
                                                        {p}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={filterStatus}
                                            onValueChange={setFilterStatus}
                                        >
                                            <SelectTrigger className="w-[140px] h-8 text-[11px] font-bold rounded-lg border-slate-200 bg-white">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos" className="text-xs font-bold">
                                                    Todos Status
                                                </SelectItem>
                                                <SelectItem value="VALIDADO" className="text-xs font-bold text-emerald-700">
                                                    🟩 Validado
                                                </SelectItem>
                                                <SelectItem value="COM_PENDENCIAS" className="text-xs font-bold text-amber-700">
                                                    🟨 Com Pendências
                                                </SelectItem>
                                                <SelectItem value="IGUAL_PROJETO" className="text-xs font-bold text-[#9C1915]">
                                                    🟥 Igual ao Projeto
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {viewMode === "table" ? (
                                    <DocumentsListView
                                        entregas={filteredEntregas}
                                        isLoading={isLoading}
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        onViewDetail={handleViewDetail}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onStatusChange={handleStatusChange}
                                        isUpdatingStatus={updateStatusMutation.isPending}
                                        updatingId={updateStatusMutation.variables?.id}
                                    />
                                ) : (
                                    <PacketsListView
                                        entregas={filteredEntregas}
                                        onViewDetail={handleViewDetail}
                                        onDelete={handleDelete}
                                    />
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

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
