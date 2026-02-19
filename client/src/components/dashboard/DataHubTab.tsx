import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search,
    FileSpreadsheet,
    Layout,
    Map,
    ListChecks,
    ClipboardCheck,
    Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReportPreviewModal } from "@/components/dashboard/ReportPreviewModal";

export default function DataHubTab() {
    const [search, setSearch] = useState("");
    const [subTab, setSubTab] = useState("mapping");

    // Filters
    const [filterEdificacao, setFilterEdificacao] = useState("Todas");
    const [filterPavimento, setFilterPavimento] = useState("Todos");
    const [filterDisciplina, setFilterDisciplina] = useState("Todas");
    const [filterStatus, setFilterStatus] = useState("Todos");
    const [responsavelFilter, setResponsavelFilter] = useState("Todos");

    const utils = trpc.useUtils();

    // Data Fetching
    const { data: salas = [], isLoading: salasLoading } = trpc.dashboard.getSalas.useQuery();
    const { data: apontamentos = [] } = trpc.dashboard.getApontamentos.useQuery();

    // Mutations
    const updateSala = trpc.dashboard.updateSalaStatus.useMutation({
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await utils.dashboard.getSalas.cancel();

            // Snapshot previous value
            const previousSalas = utils.dashboard.getSalas.getData();

            // Optimistically update
            utils.dashboard.getSalas.setData(undefined, (old: any) => {
                if (!old) return old;
                return old.map((s: any) => {
                    if (s.id === variables.id) {
                        const updated = { ...s, ...variables };
                        // Immediate status calculation helper
                        const isLiberado =
                            (updated.augin === 1) &&
                            (updated.trackerPosicionado === 1) &&
                            (updated.qrCodePlastificado === 1);
                        updated.statusRA = isLiberado ? "LIBERADO PARA OBRA" : "PENDENTE";

                        // Room status
                        if (updated.revisar || updated.obs || updated.obs2) {
                            updated.status = "REVISAR";
                        } else if (updated.dataVerificada) {
                            updated.status = "VERIFICADA";
                        } else {
                            updated.status = "PENDENTE";
                        }

                        return updated;
                    }
                    return s;
                });
            });

            return { previousSalas };
        },
        onError: (err, _variables, context) => {
            console.error(err);
            if (context?.previousSalas) {
                utils.dashboard.getSalas.setData(undefined, context.previousSalas);
            }
            toast.error("Erro ao atualizar!");
        },
        onSettled: () => {
            utils.dashboard.getSalas.invalidate();
        },
    });

    const updateApontamento = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: () => {
            toast.success("Apontamento atualizado!");
            utils.dashboard.getApontamentos.invalidate();
        },
        onError: () => toast.error("Erro ao atualizar apontamento.")
    });

    const downloadExcel = async () => {
        try {
            toast.info("Gerando Excel...");
            const base64 = await utils.dashboard.getExcelReport.fetch();
            const link = document.createElement('a');
            link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
            link.download = `Relatorio_Controle_${new Date().toISOString().split('T')[0]}.xlsx`;
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
            const matchesSearch = (s.nome || "").toLowerCase().includes(searchLower) ||
                (s.edificacao || "").toLowerCase().includes(searchLower) ||
                (s.pavimento || "").toLowerCase().includes(searchLower) ||
                (s.numeroSala || "").toLowerCase().includes(searchLower);

            const matchesEdificacao = filterEdificacao === "Todas" || s.edificacao === filterEdificacao;
            const matchesPavimento = filterPavimento === "Todos" || s.pavimento === filterPavimento;
            // Status filter logic for "Status Verificação" tab mainly, but consistent
            const currentStatus = s.status || "PENDENTE";
            const matchesStatus = filterStatus === "Todos" || currentStatus === filterStatus;

            return matchesSearch && matchesEdificacao && matchesPavimento && matchesStatus;
        });

        // Numerical stable sort
        return [...filtered].sort((a, b) => {
            const nA = parseInt(String(a.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            const nB = parseInt(String(b.numeroSala || "0").replace(/\D/g, ""), 10) || 0;
            if (nA !== nB) return nA - nB;
            return (a.nome || "").localeCompare(b.nome || "");
        });
    }, [salas, search, filterEdificacao, filterPavimento, filterStatus]);


    // Unique values for dropdowns
    const uniqueEdificacoes = useMemo(() => Array.from(new Set(salas.map((s: any) => s.edificacao))).sort() as string[], [salas]);
    const uniquePavimentos = useMemo(() => {
        const filteredByBuilding = filterEdificacao === "Todas" ? salas : salas.filter((s: any) => s.edificacao === filterEdificacao);
        return Array.from(new Set(filteredByBuilding.map((s: any) => s.pavimento))).sort();
    }, [salas, filterEdificacao]);

    const sortedApontamentos = useMemo(() => {
        const filtered = (apontamentos || []).filter((a: any) => {
            const searchLower = (search || "").toLowerCase();
            const matchesSearch = (a.sala || "").toLowerCase().includes(searchLower) ||
                (a.disciplina || "").toLowerCase().includes(searchLower) ||
                (a.divergencia || "").toLowerCase().includes(searchLower) ||
                (a.edificacao || "").toLowerCase().includes(searchLower);

            const matchesResponsavel = responsavelFilter === "Todos" || a.responsavel === responsavelFilter;
            const matchesDisciplina = filterDisciplina === "Todas" || a.disciplina === filterDisciplina;

            return matchesSearch && matchesResponsavel && matchesDisciplina;
        });

        return [...filtered].sort((a, b) => {
            return new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime() || (b.numeroApontamento - a.numeroApontamento);
        });
    }, [apontamentos, search, responsavelFilter, filterDisciplina]);

    const uniqueDisciplinas = useMemo(() => Array.from(new Set(apontamentos.map((a: any) => a.disciplina))).sort() as string[], [apontamentos]);
    const uniqueResponsaveis = useMemo(() => Array.from(new Set(apontamentos.map((a: any) => a.responsavel))).filter(Boolean).sort() as string[], [apontamentos]);

    if (salasLoading && salas.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Carregando tabelas pela primeira vez...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por sala, edificação ou disciplina..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
                    <Button variant="outline" size="sm" onClick={downloadExcel} className="h-9 gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Excel
                    </Button>

                    <ReportPreviewModal
                        edificacoes={uniqueEdificacoes}
                        disciplinas={uniqueDisciplinas}
                        responsaveis={uniqueResponsaveis}
                    />
                </div>
            </div>

            <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-slate-100 p-1">
                    <TabsTrigger value="mapping" className="gap-2 data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                        <Map className="w-4 h-4" />
                        Mapeamento Salas
                    </TabsTrigger>
                    <TabsTrigger value="findings" className="gap-2 data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                        <ListChecks className="w-4 h-4" />
                        Apontamentos RA
                    </TabsTrigger>
                    <TabsTrigger value="status" className="gap-2 data-[state=active]:bg-[#940707] data-[state=active]:text-white">
                        <ClipboardCheck className="w-4 h-4" />
                        Status Verificação
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: MAPEAMENTO SALAS */}
                <TabsContent value="mapping" className="mt-4">
                    <Card>
                        <CardHeader className="pb-3 border-b border-[#940707]/10 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#940707]">Controle de Modelos (Checklist)</CardTitle>
                            <div className="flex gap-2">
                                <select className="text-xs border rounded p-1" value={filterEdificacao} onChange={(e) => setFilterEdificacao(e.target.value)}>
                                    <option value="Todas">Todas Edificações</option>
                                    {uniqueEdificacoes.map((ed: any) => <option key={ed} value={ed}>{ed}</option>)}
                                </select>
                                <select className="text-xs border rounded p-1" value={filterPavimento} onChange={(e) => setFilterPavimento(e.target.value)}>
                                    <option value="Todos">Todos Pavimentos</option>
                                    {uniquePavimentos.map((p: any) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold">Edificação</TableHead>
                                            <TableHead className="font-bold">Pavimento</TableHead>
                                            <TableHead className="font-bold">Setor</TableHead>
                                            <TableHead className="font-bold">Sala</TableHead>
                                            <TableHead className="text-center font-bold">Planta</TableHead>
                                            <TableHead className="text-center font-bold">Augin?</TableHead>
                                            <TableHead className="text-center font-bold">Tracker?</TableHead>
                                            <TableHead className="text-center font-bold">QR Plast.?</TableHead>
                                            <TableHead className="font-bold">Status RA</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedSalas.map((sala: any) => (
                                            <TableRow key={sala.id}>
                                                <TableCell className="text-sm">{sala.edificacao}</TableCell>
                                                <TableCell className="text-sm">{sala.pavimento}</TableCell>
                                                <TableCell className="text-sm font-bold text-slate-500">{sala.setor}</TableCell>
                                                <TableCell className="font-medium text-sm">
                                                    <div>{sala.nome}</div>
                                                    <div className="text-[10px] text-muted-foreground">Nº {sala.numeroSala}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className={sala.imagemPlantaUrl ? "text-green-600" : "text-gray-400"}>
                                                                <ImageIcon size={16} />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80">
                                                            <ImageUpload
                                                                bucketName="project-assets"
                                                                folderPath={`plantas/${sala.edificacao}/${sala.pavimento}`}
                                                                currentImageUrl={sala.imagemPlantaUrl}
                                                                onUploadComplete={(url) => updateSala.mutate({ id: sala.id, imagemPlantaUrl: url })}
                                                                label={`Planta: ${sala.nome}`}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <label className="relative flex items-center cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!sala.augin}
                                                                onChange={(e) => updateSala.mutate({ id: sala.id, augin: e.target.checked ? 1 : 0 })}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-5 h-5 bg-white border-2 border-slate-300 rounded-md peer-checked:bg-[#940707] peer-checked:border-[#940707] transition-all flex items-center justify-center after:content-['✓'] after:text-white after:text-xs after:hidden peer-checked:after:block hover:border-[#940707]/50" />
                                                        </label>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <label className="relative flex items-center cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!sala.trackerPosicionado}
                                                                onChange={(e) => updateSala.mutate({ id: sala.id, trackerPosicionado: e.target.checked ? 1 : 0 })}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-5 h-5 bg-white border-2 border-slate-300 rounded-md peer-checked:bg-[#940707] peer-checked:border-[#940707] transition-all flex items-center justify-center after:content-['✓'] after:text-white after:text-xs after:hidden peer-checked:after:block hover:border-[#940707]/50" />
                                                        </label>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <label className="relative flex items-center cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!sala.qrCodePlastificado}
                                                                onChange={(e) => updateSala.mutate({ id: sala.id, qrCodePlastificado: e.target.checked ? 1 : 0 })}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-5 h-5 bg-white border-2 border-slate-300 rounded-md peer-checked:bg-[#940707] peer-checked:border-[#940707] transition-all flex items-center justify-center after:content-['✓'] after:text-white after:text-xs after:hidden peer-checked:after:block hover:border-[#940707]/50" />
                                                        </label>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sala.statusRA === 'LIBERADO PARA OBRA' ? 'bg-[#10b981] text-white' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {sala.statusRA || 'PENDENTE'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: APONTAMENTOS RA OBRA */}
                <TabsContent value="findings" className="mt-4">
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-[#940707]/10">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#940707]">Divergências de Campo</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground mr-1">Filtros:</span>
                                <select
                                    className="text-xs border rounded p-1"
                                    value={filterDisciplina}
                                    onChange={(e) => setFilterDisciplina(e.target.value)}
                                >
                                    <option value="Todas">Todas Disciplinas</option>
                                    {uniqueDisciplinas.map((d: any) => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select
                                    className="text-xs border rounded p-1"
                                    value={responsavelFilter}
                                    onChange={(e) => setResponsavelFilter(e.target.value)}
                                >
                                    <option value="Todos">Todos Responsáveis</option>
                                    <option value="Thá">Thá</option>
                                    <option value="Ocle">Ocle</option>
                                    <option value="Stecla">Stecla</option>
                                    <option value="Instaladora">Instaladora</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold">Data/Nº</TableHead>
                                            <TableHead className="font-bold">Edificação</TableHead>
                                            <TableHead className="font-bold">Pavimento</TableHead>
                                            <TableHead className="font-bold">Setor</TableHead>
                                            <TableHead className="font-bold">Sala</TableHead>
                                            <TableHead className="font-bold">Disc.</TableHead>
                                            <TableHead className="font-bold">Responsável</TableHead>
                                            <TableHead className="font-bold w-[25%]">Divergência</TableHead>
                                            <TableHead className="font-bold text-center">Evidências</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedApontamentos.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium text-primary">#{item.numeroApontamento}</div>
                                                    <div className="text-muted-foreground">{format(new Date(item.data), "dd/MM/yy")}</div>
                                                </TableCell>
                                                <TableCell className="text-sm">{item.edificacao}</TableCell>
                                                <TableCell className="text-sm">{item.pavimento}</TableCell>
                                                <TableCell className="text-sm font-bold text-slate-500">{item.setor}</TableCell>
                                                <TableCell className="text-sm font-bold">{item.sala}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-7 text-xs w-24"
                                                        defaultValue={item.disciplina}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== item.disciplina) {
                                                                updateApontamento.mutate({ id: item.id, disciplina: e.target.value });
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <select
                                                        className={`h-7 px-2 rounded text-[10px] font-bold border ${item.responsavel === 'Thá' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}
                                                        value={item.responsavel || "Ocle"}
                                                        onChange={(e) => updateApontamento.mutate({ id: item.id, responsavel: e.target.value })}
                                                    >
                                                        <option value="Thá">Thá</option>
                                                        <option value="Ocle">Ocle</option>
                                                        <option value="Stecla">Stecla</option>
                                                        <option value="Instaladora">Instaladora</option>
                                                    </select>
                                                </TableCell>
                                                <TableCell className="text-sm italic text-muted-foreground w-full">
                                                    <Input
                                                        className="h-8 text-sm"
                                                        defaultValue={item.divergencia || ""}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== (item.divergencia || "")) {
                                                                updateApontamento.mutate({ id: item.id, divergencia: e.target.value });
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex gap-1 justify-center">
                                                        {/* Model Photo (Referencia) */}
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon" className={item.fotoReferenciaUrl ? "text-blue-600" : "text-gray-300"} title="Foto Modelo">
                                                                    <Layout size={16} />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80">
                                                                <ImageUpload
                                                                    bucketName="project-assets"
                                                                    folderPath={`apontamentos/referencias`}
                                                                    currentImageUrl={item.fotoReferenciaUrl}
                                                                    onUploadComplete={(url) => updateApontamento.mutate({ id: item.id, fotoReferenciaUrl: url })}
                                                                    label="Foto Modelo / Referência"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>

                                                        {/* Real Photo (Obra) */}
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon" className={item.fotoUrl ? "text-red-600" : "text-gray-300"} title="Foto Obra">
                                                                    <ImageIcon size={16} />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80">
                                                                <ImageUpload
                                                                    bucketName="project-assets"
                                                                    folderPath={`apontamentos/real`}
                                                                    currentImageUrl={item.fotoUrl}
                                                                    onUploadComplete={(url) => updateApontamento.mutate({ id: item.id, fotoUrl: url })}
                                                                    label="Foto Real / Obra"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: STATUS VERIFICAÇÃO */}
                <TabsContent value="status" className="mt-4">
                    <Card>
                        <CardHeader className="pb-3 border-b border-[#940707]/10 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#940707]">Acompanhamento da Verificação</CardTitle>
                            <div className="flex gap-2">
                                <select className="text-xs border rounded p-1" value={filterEdificacao} onChange={(e) => setFilterEdificacao(e.target.value)}>
                                    <option value="Todas">Todas Edificações</option>
                                    {uniqueEdificacoes.map((ed: any) => <option key={ed} value={ed}>{ed}</option>)}
                                </select>
                                <select className="text-xs border rounded p-1" value={filterPavimento} onChange={(e) => setFilterPavimento(e.target.value)}>
                                    <option value="Todos">Todos Pavimentos</option>
                                    {uniquePavimentos.map((p: any) => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select className="text-xs border rounded p-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="Todos">Todos Status</option>
                                    <option value="VERIFICADA">Verificada</option>
                                    <option value="REVISAR">Revisar</option>
                                    <option value="PENDENTE">Pendente</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold">Edificação</TableHead>
                                            <TableHead className="font-bold">Pavimento</TableHead>
                                            <TableHead className="font-bold">Setor</TableHead>
                                            <TableHead className="font-bold">Sala</TableHead>
                                            <TableHead className="font-bold whitespace-nowrap">Data Verif.</TableHead>
                                            <TableHead className="text-center font-bold">Faltou?</TableHead>
                                            <TableHead className="font-bold">Observações</TableHead>
                                            <TableHead className="font-bold whitespace-nowrap">Data 2</TableHead>
                                            <TableHead className="font-bold">Obs 2</TableHead>
                                            <TableHead className="font-bold">Status Sala</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedSalas.map((sala: any) => (
                                            <TableRow key={sala.id}>
                                                <TableCell className="text-sm">{sala.edificacao}</TableCell>
                                                <TableCell className="text-sm">{sala.pavimento}</TableCell>
                                                <TableCell className="text-sm font-bold text-slate-500">{sala.setor}</TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="font-bold">{sala.nome}</div>
                                                    <div className="text-[10px] text-muted-foreground">Nº {sala.numeroSala}</div>
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <Input
                                                        type="date"
                                                        className="h-8 text-[10px] w-28 p-1"
                                                        value={sala.dataVerificada ? new Date(sala.dataVerificada).toISOString().split('T')[0] : ""}
                                                        onChange={(e) => updateSala.mutate({ id: sala.id, dataVerificada: e.target.value ? new Date(e.target.value) : undefined })}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <label className="relative flex items-center cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={sala.faltouDisciplina === "Sim"}
                                                                onChange={(e) => updateSala.mutate({ id: sala.id, faltouDisciplina: e.target.checked ? "Sim" : "Não" })}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-5 h-5 bg-white border-2 border-slate-300 rounded-md peer-checked:bg-[#940707] peer-checked:border-[#940707] transition-all flex items-center justify-center after:content-['✓'] after:text-white after:text-xs after:hidden peer-checked:after:block hover:border-[#940707]/50" />
                                                        </label>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <Input
                                                        className="h-8 text-xs min-w-[120px]"
                                                        value={sala.obs || ""}
                                                        onChange={(e) => updateSala.mutate({ id: sala.id, obs: e.target.value })}
                                                        onBlur={(e) => updateSala.mutate({ id: sala.id, obs: e.target.value })}
                                                        placeholder="Nota..."
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <Input
                                                        type="date"
                                                        className="h-8 text-[10px] w-28 p-1"
                                                        value={sala.dataVerificacao2 ? new Date(sala.dataVerificacao2).toISOString().split('T')[0] : ""}
                                                        onChange={(e) => updateSala.mutate({ id: sala.id, dataVerificacao2: e.target.value ? new Date(e.target.value) : undefined })}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <Input
                                                        className="h-8 text-xs min-w-[120px]"
                                                        value={sala.obs2 || ""}
                                                        onChange={(e) => updateSala.mutate({ id: sala.id, obs2: e.target.value })}
                                                        onBlur={(e) => updateSala.mutate({ id: sala.id, obs2: e.target.value })}
                                                        placeholder="Obs 2..."
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sala.status === 'VERIFICADA' ? 'bg-emerald-100 text-emerald-700' :
                                                        sala.status === 'REVISAR' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500' // Changed to Slate/Gray for Pendente
                                                        }`}>
                                                        {sala.status || 'PENDENTE'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
