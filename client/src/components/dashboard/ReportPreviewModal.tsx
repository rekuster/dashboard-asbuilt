import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Download, Filter, Clock, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ReportPreviewModalProps {
    edificacoes: string[];
    disciplinas: string[];
    responsaveis: string[];
}

export function ReportPreviewModal({ edificacoes, disciplinas, responsaveis }: ReportPreviewModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [reportType, setReportType] = useState<"CQ" | "AB">("CQ");
    const [base64Pdf, setBase64Pdf] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Filters
    const [filterEdificacao, setFilterEdificacao] = useState("Todas");
    const [filterPavimento, setFilterPavimento] = useState("Todos");
    const [filterDisciplina, setFilterDisciplina] = useState("Todas");
    const [filterResponsavel, setFilterResponsavel] = useState("Todos");
    const [filterSala] = useState(""); 
    
    // Novas opções de filtro e rastreamento
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [apenasNaoEnviados, setApenasNaoEnviados] = useState(false);
    const [confirmarEnvio, setConfirmarEnvio] = useState(false);

    // Fetch pavimentos based on selected edificacao
    const { data: pavimentos = [] } = trpc.dashboard.getPavimentos.useQuery(
        { edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined },
        { enabled: isOpen }
    );

    const utils = trpc.useUtils();
    const { data: history = [], isLoading: isLoadingHistory } = trpc.dashboard.getHistoricoRelatorios.useQuery();
    const markAsSentMutation = trpc.dashboard.markApontamentosAsSentByFilters.useMutation();

    const generatePreview = async () => {
        setIsLoading(true);
        setBase64Pdf(null);
        try {
            let base64 = "";
            const filters = {
                edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined,
                pavimento: filterPavimento !== "Todos" ? filterPavimento : undefined,
                disciplina: filterDisciplina !== "Todas" ? filterDisciplina : undefined,
                responsavel: filterResponsavel !== "Todos" ? filterResponsavel : undefined,
                sala: filterSala || undefined
            };

            if (reportType === "CQ") {
                base64 = await utils.dashboard.getPDFReport.fetch({
                    ...filters,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    apenasNaoEnviados
                });
            } else {
                base64 = await utils.dashboard.getAsBuiltReport.fetch({ 
                    edificacao: filters.edificacao,
                    pavimento: filters.pavimento,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
            }

            setBase64Pdf(base64);
            toast.success("Preview gerado com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar preview:", error);
            toast.error("Erro ao gerar preview do relatório.");
        } finally {
            setIsLoading(false);
        }
    };

    const downloadPDF = async () => {
        setIsDownloading(true);
        try {
            let dataToDownload = base64Pdf;

            // Se ainda não geramos o preview, buscamos os dados agora para baixar diretamente
            if (!dataToDownload) {
                const filters = {
                    edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined,
                    pavimento: filterPavimento !== "Todos" ? filterPavimento : undefined,
                    disciplina: filterDisciplina !== "Todas" ? filterDisciplina : undefined,
                    responsavel: filterResponsavel !== "Todos" ? filterResponsavel : undefined,
                    sala: filterSala || undefined
                };

                if (reportType === "CQ") {
                    dataToDownload = await utils.dashboard.getPDFReport.fetch({
                        ...filters,
                        startDate: startDate || undefined,
                        endDate: endDate || undefined,
                        apenasNaoEnviados
                    });
                } else {
                    dataToDownload = await utils.dashboard.getAsBuiltReport.fetch({ 
                        edificacao: filters.edificacao,
                        pavimento: filters.pavimento,
                        startDate: startDate || undefined,
                        endDate: endDate || undefined,
                    });
                }
            }

            if (!dataToDownload) throw new Error("Falha ao obter dados do PDF");

            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${dataToDownload}`;
            link.download = `${reportType === 'CQ' ? 'Relatorio_Divergencias' : 'Relatorio_AsBuilt'}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success("Download iniciado!");

            // Se o usuário optou por marcar como enviado
            if (confirmarEnvio && reportType === "CQ") {
                try {
                    const result = await markAsSentMutation.mutateAsync({
                        edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined,
                        pavimento: filterPavimento !== "Todos" ? filterPavimento : undefined,
                        disciplina: filterDisciplina !== "Todas" ? filterDisciplina : undefined,
                        responsavel: filterResponsavel !== "Todos" ? filterResponsavel : undefined,
                        startDate: startDate || undefined,
                        endDate: endDate || undefined,
                        apenasNaoEnviados
                    });
                    if (result.success) {
                        toast.success(`${result.count} itens marcados como enviados.`);
                        utils.dashboard.getApontamentos.invalidate();
                        utils.dashboard.getHistoricoRelatorios.invalidate();
                    }
                } catch (e) {
                    console.error("Erro ao marcar como enviado:", e);
                    toast.error("Erro ao registrar envio no banco de dados.");
                }
            }
        } catch (error) {
            console.error("Erro ao baixar PDF:", error);
            toast.error("Erro ao gerar arquivo para download.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Reset preview when filters change? Maybe not, manual refresh is better for performance.

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100">
                    <FileText className="w-4 h-4" />
                    Gerar Relatórios
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gerador de Relatórios</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="generator" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger value="generator" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                            <FileText className="w-4 h-4" />
                            Novo Relatório
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                            <Clock className="w-4 h-4" />
                            Histórico de Envios
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="generator" className="flex-1 flex flex-col overflow-hidden m-0 gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-4 border-b items-end">
                            <div className="flex flex-col gap-2">
                                <Label>Tipo de Relatório</Label>
                                <Select value={reportType} onValueChange={(v: "CQ" | "AB") => setReportType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CQ">Relatório de Divergências</SelectItem>
                                        <SelectItem value="AB">As-Built (AB)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Edificação</Label>
                                <Select value={filterEdificacao} onValueChange={(v) => {
                                    setFilterEdificacao(v);
                                    setFilterPavimento("Todos");
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todas">Todas</SelectItem>
                                        {edificacoes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Pavimento</Label>
                                <Select value={filterPavimento} onValueChange={setFilterPavimento}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        {pavimentos.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Disciplina</Label>
                                <Select value={filterDisciplina} onValueChange={setFilterDisciplina} disabled={reportType === 'AB'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todas">Todas</SelectItem>
                                        {disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Responsável</Label>
                                <Select value={filterResponsavel} onValueChange={setFilterResponsavel} disabled={reportType === 'AB'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button onClick={generatePreview} disabled={isLoading} className="w-full bg-red-800 hover:bg-red-900 h-9">
                                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
                                    Gerar Preview
                                </Button>
                            </div>
                        </div>

                        {/* Filtros de Data e Rastreamento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-3 bg-slate-50/50 px-4 rounded-lg italic">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500">Data Início</Label>
                                <Input 
                                    type="date" 
                                    className="h-8 text-xs bg-white" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500">Data Fim</Label>
                                <Input 
                                    type="date" 
                                    className="h-8 text-xs bg-white" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)} 
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                                <Checkbox 
                                    id="only-new" 
                                    checked={apenasNaoEnviados} 
                                    onCheckedChange={(checked) => setApenasNaoEnviados(!!checked)} 
                                />
                                <Label htmlFor="only-new" className="text-xs font-medium cursor-pointer">Apenas não enviados</Label>
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                                <Checkbox 
                                    id="confirm-sent" 
                                    checked={confirmarEnvio} 
                                    onCheckedChange={(checked) => setConfirmarEnvio(!!checked)} 
                                />
                                <Label htmlFor="confirm-sent" className="text-xs font-bold text-red-700 cursor-pointer">Confirmar Envio (Limpar Lista)</Label>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200 flex items-center justify-center min-h-[300px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span>Gerando PDF...</span>
                                </div>
                            ) : base64Pdf ? (
                                <iframe
                                    src={`data:application/pdf;base64,${base64Pdf}#toolbar=0&navpanes=0`}
                                    className="w-full h-full"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center gap-2">
                                    <FileText className="w-12 h-12 opacity-20" />
                                    <span>Selecione os filtros e clique em "Gerar Preview"</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t mt-auto">
                            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading || isDownloading}>Fechar</Button>
                            <Button 
                                onClick={downloadPDF} 
                                disabled={isLoading || isDownloading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                            >
                                {isDownloading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                {isDownloading ? "Baixando..." : "Baixar PDF"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden m-0">
                        <div className="rounded-lg border bg-white overflow-hidden flex-1 flex flex-col">
                            <div className="overflow-y-auto flex-1">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[180px]">Data Geração</TableHead>
                                            <TableHead>Título / Período</TableHead>
                                            <TableHead>Filtro</TableHead>
                                            <TableHead className="text-right">Itens</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingHistory ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                                </TableCell>
                                            </TableRow>
                                        ) : history.length > 0 ? (
                                            history.map((h: any) => (
                                                <TableRow key={h.id}>
                                                    <TableCell className="text-xs font-medium">
                                                        {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-slate-800 text-xs">{h.titulo}</div>
                                                        <div className="text-[10px] text-slate-500">
                                                            Periodo: {h.periodoInicio ? format(new Date(h.periodoInicio), "dd/MM/yyyy") : "Início"} 
                                                            {" até "} 
                                                            {h.periodoFim ? format(new Date(h.periodoFim), "dd/MM/yyyy") : "Hoje"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {h.disciplina ? (
                                                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                                                                {h.disciplina}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400italic">Sem filtro</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-slate-700">
                                                        {h.quantidadeItens}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-40 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <Clock className="w-10 h-10 opacity-20" />
                                                        <p className="text-sm">Nenhum relatório oficial registrado ainda.</p>
                                                        <p className="text-[10px]">Ao clicar em "Confirmar Envio" durante o download, o registro aparecerá aqui.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Fechar</Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
