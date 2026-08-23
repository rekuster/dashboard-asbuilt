import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Map, ListChecks, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ReportPreviewModal } from "@/components/dashboard/ReportPreviewModal";
import { EditApontamentoModal } from "@/components/dashboard/EditApontamentoModal";
import { DataHubFilters } from "./components/DataHubFilters";
import { RoomMappingTable } from "./components/RoomMappingTable";
import { IssuesMasterTable } from "./components/IssuesMasterTable";
import { RoomStatusTable } from "./components/RoomStatusTable";

export default function DataHubTab({ projectId }: { projectId: string }) {
    const [search, setSearch] = useState("");
    const [subTab, setSubTab] = useState("mapping");

    // Filters
    const [filterEdificacao, setFilterEdificacao] = useState("Todas");
    const [filterPavimento, setFilterPavimento] = useState("Todos");
    const [filterDisciplina, setFilterDisciplina] = useState("Todas");
    const [filterStatus, setFilterStatus] = useState("Todos");
    const [responsavelFilter, setResponsavelFilter] = useState("Todos");

    const [selectedApontamento, setSelectedApontamento] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const utils = trpc.useUtils();

    // Data Fetching
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery({ projectId });
    const { data: apontamentos = [] } = trpc.dashboard.getApontamentos.useQuery({ projectId });

    // Mutations
    const getExcelReportMutation = trpc.dashboard.getExcelReport.useMutation();

    const updateSala = trpc.dashboard.updateSalaStatus.useMutation({
        onSuccess: () => {
            utils.dashboard.getSalas.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            toast.success("Sala atualizada com sucesso!");
        },
        onError: (err) => {
            toast.error("Erro ao atualizar sala: " + err.message);
        },
    });

    const updateApontamento = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: () => {
            utils.dashboard.getApontamentos.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            toast.success("Apontamento atualizado!");
        },
        onError: (err) => {
            toast.error("Erro ao atualizar apontamento: " + err.message);
        },
    });

    const deleteApontamento = trpc.dashboard.deleteApontamento.useMutation({
        onSuccess: () => {
            utils.dashboard.getApontamentos.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });
            toast.success("Apontamento excluído!");
        },
        onError: (err) => {
            toast.error("Erro ao excluir apontamento: " + err.message);
        },
    });

    const handleDeleteApontamento = (id: number, numero: number) => {
        if (confirm(`Deseja realmente excluir o apontamento #${numero}?`)) {
            deleteApontamento.mutate({ id });
        }
    };

    const handleEditClick = (apont: any) => {
        setSelectedApontamento(apont);
        setIsEditModalOpen(true);
    };

    const downloadExcel = async () => {
        try {
            toast.info("Gerando Excel...");
            const base64 = await getExcelReportMutation.mutateAsync({ projectId });
            const link = document.createElement("a");
            link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
            link.download = `Relatorio_Controle_${new Date().toISOString().split("T")[0]}.xlsx`;
            link.click();
            toast.success("Excel baixado!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao baixar Excel.");
        }
    };

    // Filter & Sort Logic
    const sortedSalas = useMemo(() => {
        const filtered = (salas || []).filter((s: any) => {
            const searchLower = (search || "").toLowerCase();
            const matchesSearch =
                (s.nome || "").toLowerCase().includes(searchLower) ||
                (s.edificacao || "").toLowerCase().includes(searchLower) ||
                (s.pavimento || "").toLowerCase().includes(searchLower) ||
                (s.numeroSala || "").toLowerCase().includes(searchLower);

            const matchesEdificacao =
                filterEdificacao === "Todas" || s.edificacao === filterEdificacao;
            const matchesPavimento =
                filterPavimento === "Todos" || s.pavimento === filterPavimento;
            const currentStatus = s.status || "PENDENTE";
            const matchesStatus =
                filterStatus === "Todos" || currentStatus === filterStatus;

            return matchesSearch && matchesEdificacao && matchesPavimento && matchesStatus;
        });

        return [...filtered].sort((a, b) => {
            const nA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            const nB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            if (nA !== nB) return nA - nB;
            return (a.nome || "").localeCompare(b.nome || "");
        });
    }, [salas, search, filterEdificacao, filterPavimento, filterStatus]);

    const uniqueEdificacoes = useMemo(
        () => Array.from(new Set(salas.map((s: any) => s.edificacao))).sort() as string[],
        [salas]
    );

    const uniquePavimentos = useMemo(() => {
        const filteredByBuilding =
            filterEdificacao === "Todas"
                ? salas
                : salas.filter((s: any) => s.edificacao === filterEdificacao);
        return Array.from(new Set(filteredByBuilding.map((s: any) => s.pavimento))).sort();
    }, [salas, filterEdificacao]);

    const sortedApontamentos = useMemo(() => {
        const filtered = (apontamentos || []).filter((a: any) => {
            const searchLower = (search || "").toLowerCase();
            const matchesSearch =
                (a.sala || "").toLowerCase().includes(searchLower) ||
                (a.disciplina || "").toLowerCase().includes(searchLower) ||
                (a.divergencia || "").toLowerCase().includes(searchLower) ||
                (a.edificacao || "").toLowerCase().includes(searchLower);

            const matchesResponsavel =
                responsavelFilter === "Todos" || a.responsavel === responsavelFilter;
            const matchesDisciplina =
                filterDisciplina === "Todas" || a.disciplina === filterDisciplina;

            return matchesSearch && matchesResponsavel && matchesDisciplina;
        });

        return [...filtered].sort((a, b) => {
            return (b.numeroApontamento || 0) - (a.numeroApontamento || 0);
        });
    }, [apontamentos, search, responsavelFilter, filterDisciplina]);

    const uniqueDisciplinas = useMemo(
        () =>
            Array.from(new Set(apontamentos.map((a: any) => a.disciplina))).sort() as string[],
        [apontamentos]
    );

    const uniqueResponsaveis = useMemo(
        () =>
            Array.from(
                new Set(apontamentos.map((a: any) => a.responsavel))
            ).filter(Boolean).sort() as string[],
        [apontamentos]
    );

    if (salas.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 italic">
                Nenhum dado encontrado para este projeto.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <DataHubFilters
                    search={search}
                    onSearchChange={setSearch}
                    filterEdificacao={filterEdificacao}
                    onEdificacaoChange={setFilterEdificacao}
                    edificacoes={uniqueEdificacoes}
                    filterPavimento={filterPavimento}
                    onPavimentoChange={setFilterPavimento}
                    pavimentos={uniquePavimentos}
                    filterDisciplina={filterDisciplina}
                    onDisciplinaChange={setFilterDisciplina}
                    disciplinas={uniqueDisciplinas}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    showDisciplineFilter={subTab === "findings"}
                />

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadExcel}
                        className="h-9 gap-2 rounded-full border-slate-200 text-xs font-bold"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Excel
                    </Button>

                    <ReportPreviewModal
                        projectId={projectId}
                        edificacoes={uniqueEdificacoes}
                        disciplinas={uniqueDisciplinas}
                        responsaveis={uniqueResponsaveis}
                    />
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger
                        value="mapping"
                        className="gap-2 rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white text-xs font-bold"
                    >
                        <Map className="w-4 h-4" />
                        Mapeamento Salas
                    </TabsTrigger>
                    <TabsTrigger
                        value="findings"
                        className="gap-2 rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white text-xs font-bold"
                    >
                        <ListChecks className="w-4 h-4" />
                        Apontamentos RA ({sortedApontamentos.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="status"
                        className="gap-2 rounded-lg data-[state=active]:bg-[#940707] data-[state=active]:text-white text-xs font-bold"
                    >
                        <ClipboardCheck className="w-4 h-4" />
                        Status Verificação
                    </TabsTrigger>
                </TabsList>

                {/* SubTab 1: Mapeamento */}
                <TabsContent value="mapping" className="mt-4">
                    <Card className="border border-slate-100 shadow-sm">
                        <CardHeader className="py-3 px-5 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#940707]">
                                Controle de Modelos & Checklist de Campo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <RoomMappingTable
                                salas={sortedSalas}
                                onUpdateSala={(data) => updateSala.mutate(data)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SubTab 2: Apontamentos */}
                <TabsContent value="findings" className="mt-4">
                    <Card className="border border-slate-100 shadow-sm">
                        <CardHeader className="py-3 px-5 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#940707]">
                                Divergências de Campo (Lista Geral)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <IssuesMasterTable
                                apontamentos={sortedApontamentos}
                                onUpdateApontamento={(data) => updateApontamento.mutate(data)}
                                onDeleteApontamento={handleDeleteApontamento}
                                onEditClick={handleEditClick}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SubTab 3: Status Verificação */}
                <TabsContent value="status" className="mt-4">
                    <Card className="border border-slate-100 shadow-sm">
                        <CardHeader className="py-3 px-5 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#940707]">
                                Acompanhamento de Verificações & Datas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <RoomStatusTable
                                salas={sortedSalas}
                                onUpdateSala={(data) => updateSala.mutate(data)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Modal */}
            {selectedApontamento && (
                <EditApontamentoModal
                    projectId={projectId}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedApontamento(null);
                    }}
                    apontamento={selectedApontamento}
                />
            )}
        </div>
    );
}
