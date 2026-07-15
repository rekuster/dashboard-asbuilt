import { useState, useEffect } from "react";
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
    projectId: string;
    edificacoes: string[];
    disciplinas: string[];
    responsaveis: string[];
}

export function ReportPreviewModal({ projectId, edificacoes, disciplinas, responsaveis }: ReportPreviewModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [reportType, setReportType] = useState<"CQ" | "AB">("CQ");
    const [base64Pdf, setBase64Pdf] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
        { projectId, edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined },
        { enabled: isOpen && !!projectId }
    );

    const utils = trpc.useUtils();
    const { data: history = [], isLoading: isLoadingHistory } = trpc.dashboard.getHistoricoRelatorios.useQuery(
        { projectId },
        { enabled: isOpen && !!projectId }
    );
    const markAsSentMutation = trpc.dashboard.markApontamentosAsSentByFilters.useMutation();

    // Converte base64 para Blob URL para o preview ser mais estável
    useEffect(() => {
        if (base64Pdf) {
            try {
                // Remove prefix if present
                const cleanBase64 = base64Pdf.replace(/^data:application\/pdf;base64,/, "");
                const byteCharacters = atob(cleanBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                
                return () => {
                    URL.revokeObjectURL(url);
                };
            } catch (e) {
                console.error("Erro ao converter PDF para Blob:", e);
                toast.error("Erro técnico ao renderizar o preview.");
            }
        } else {
            setPreviewUrl(null);
        }
    }, [base64Pdf]);

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
                    projectId,
                    ...filters,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    apenasNaoEnviados
                });
            } else {
                base64 = await utils.dashboard.getAsBuiltReport.fetch({ 
                    projectId,
                    edificacao: filters.edificacao,
                    pavimento: filters.pavimento,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
            }

            if (!base64 || base64.length < 100) {
                toast.error("Nenhum dado encontrado para os filtros selecionados.");
                return;
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
                        projectId,
                        ...filters,
                        startDate: startDate || undefined,
                        endDate: endDate || undefined,
                        apenasNaoEnviados
                    });
                } else {
                    dataToDownload = await utils.dashboard.getAsBuiltReport.fetch({ 
                        projectId,
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

            if (confirmarEnvio && reportType === "CQ") {
                try {
                    const result = await markAsSentMutation.mutateAsync({
                        projectId,
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
                        utils.dashboard.getApontamentos.invalidate({ projectId });
                        utils.dashboard.getHistoricoRelatorios.invalidate({ projectId });
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

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm transition-all hover:scale-105">
                    <FileText className="w-4 h-4" />
                    Gerar Relatórios
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle className="text-xl font-black text-[#940707] uppercase tracking-tight">Gerador de Relatório de Divergências</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="generator" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pb-2 shrink-0">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="generator" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-xs font-bold rounded-lg transition-all">
                                <FileText className="w-4 h-4" />
                                Novo Relatório
                            </TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-xs font-bold rounded-lg transition-all">
                                <Clock className="w-4 h-4" />
                                Histórico de Envios
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden px-6 pb-6 mt-2">
                        <TabsContent value="generator" className="h-full flex flex-col overflow-hidden m-0 gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pb-3 border-b items-end shrink-0">
                                <div className="flex flex-col gap-1.5 lg:col-span-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Edificação</Label>
                                    <Select value={filterEdificacao} onValueChange={(v) => {
                                        setFilterEdificacao(v);
                                        setFilterPavimento("Todos");
                                    }}>
                                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Todas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todas">Todas</SelectItem>
                                            {edificacoes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5 lg:col-span-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Pavimento</Label>
                                    <Select value={filterPavimento} onValueChange={setFilterPavimento}>
                                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todos">Todos</SelectItem>
                                            {pavimentos.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5 lg:col-span-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Disciplina</Label>
                                    <Select value={filterDisciplina} onValueChange={setFilterDisciplina} disabled={reportType === 'AB'}>
                                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Todas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todas">Todas</SelectItem>
                                            {disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5 lg:col-span-1">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Responsável</Label>
                                    <Select value={filterResponsavel} onValueChange={setFilterResponsavel} disabled={reportType === 'AB'}>
                                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todos">Todos</SelectItem>
                                            {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5 lg:col-span-1">
                                    <Button onClick={generatePreview} disabled={isLoading} className="w-full bg-[#940707] hover:bg-[#7a0606] h-10 text-xs font-bold shadow-md shadow-red-900/20 text-white rounded-lg">
                                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
                                        Gerar Preview
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-3 bg-slate-50 border border-slate-100 px-4 rounded-xl shrink-0">
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Período De</Label>
                                    <Input 
                                        type="date" 
                                        className="h-9 text-xs bg-white border-slate-200" 
                                        value={startDate} 
                                        onChange={(e) => setStartDate(e.target.value)} 
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Até</Label>
                                    <Input 
                                        type="date" 
                                        className="h-9 text-xs bg-white border-slate-200" 
                                        value={endDate} 
                                        onChange={(e) => setEndDate(e.target.value)} 
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-4">
                                    <Checkbox 
                                        id="only-new" 
                                        className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        checked={apenasNaoEnviados} 
                                        onCheckedChange={(checked) => setApenasNaoEnviados(!!checked)} 
                                    />
                                    <Label htmlFor="only-new" className="text-xs font-medium cursor-pointer text-slate-600">Apenas Pendentes</Label>
                                </div>
                                <div className="flex items-center space-x-2 pt-4">
                                    <Checkbox 
                                        id="confirm-sent" 
                                        className="border-slate-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                        checked={confirmarEnvio} 
                                        onCheckedChange={(checked) => setConfirmarEnvio(!!checked)} 
                                    />
                                    <Label htmlFor="confirm-sent" className="text-xs font-bold text-red-700 cursor-pointer">Confirmar Envio</Label>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-800/5 rounded-2xl overflow-hidden relative border-2 border-dashed border-slate-200 flex items-center justify-center min-h-[100px]">
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in zoom-in duration-300">
                                        <Loader2 className="w-10 h-10 animate-spin text-[#940707]" />
                                        <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Processando PDF...</span>
                                    </div>
                                ) : previewUrl ? (
                                    <iframe
                                        src={`${previewUrl}#toolbar=0&navpanes=0`}
                                        className="w-full h-full border-none shadow-inner"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="text-muted-foreground flex flex-col items-center gap-4 opacity-30 grayscale p-10 text-center">
                                        <FileText className="w-20 h-20 stroke-[1px]" />
                                        <div className="max-w-[250px] space-y-1">
                                            <p className="text-sm font-bold uppercase tracking-widest text-[#940707]">Nenhum Relatório Gerado</p>
                                            <p className="text-xs">Ajuste os filtros e clique no botão acima para visualizar o documento.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t mt-auto shrink-0">
                                <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading || isDownloading} className="rounded-full h-11 px-8 text-slate-500 hover:bg-slate-100 font-bold transition-all">
                                    Fechar Janela
                                </Button>
                                <Button 
                                    onClick={downloadPDF} 
                                    disabled={isLoading || isDownloading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[240px] rounded-full shadow-lg shadow-emerald-600/20 font-bold h-11 transition-all hover:scale-[1.02]"
                                >
                                    {isDownloading ? (
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    ) : (
                                        <Download className="w-5 h-5 mr-3" />
                                    )}
                                    {isDownloading ? "Baixando Arquivo..." : "Concluir e Baixar PDF"}
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="h-full flex flex-col overflow-hidden m-0">
                            <div className="rounded-2xl border bg-white overflow-hidden flex-1 flex flex-col shadow-sm border-slate-100">
                                <div className="overflow-y-auto flex-1 custom-scrollbar">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[180px] font-bold text-[10px] uppercase text-slate-400 pl-6">Data Geração</TableHead>
                                                <TableHead className="font-bold text-[10px] uppercase text-slate-400">Título / Período</TableHead>
                                                <TableHead className="font-bold text-[10px] uppercase text-slate-400">Filtro</TableHead>
                                                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-400">Itens</TableHead>
                                                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-400 pr-6">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoadingHistory ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-40 text-center">
                                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#940707] opacity-20" />
                                                    </TableCell>
                                                </TableRow>
                                            ) : history.length > 0 ? (
                                                history.map((h: any) => (
                                                    <TableRow key={h.id} className="hover:bg-slate-50/50 group transition-colors">
                                                        <TableCell className="text-[11px] font-bold text-slate-500 pl-6 border-l-4 border-transparent group-hover:border-[#940707]">
                                                            {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-black text-slate-800 text-xs uppercase tracking-tight">{h.titulo}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium">
                                                                {h.periodoInicio ? format(new Date(h.periodoInicio), "dd/MM") : "INÍCIO"} 
                                                                {" → "} 
                                                                {h.periodoFim ? format(new Date(h.periodoFim), "dd/MM") : "HOJE"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {h.disciplina ? (
                                                                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-100 font-bold px-2">
                                                                    {h.disciplina}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-300 italic font-medium">SEM FILTRO</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-slate-900 pr-4">
                                                            {h.quantidadeItens}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <div className="flex items-center justify-end gap-2 text-emerald-600 font-bold text-[10px] uppercase">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                OK
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-60 text-center">
                                                        <div className="flex flex-col items-center gap-4 text-muted-foreground py-10 opacity-30 grayscale">
                                                            <Clock className="w-16 h-16 stroke-[1px]" />
                                                            <div className="max-w-[300px]">
                                                                <p className="text-sm font-bold uppercase tracking-widest text-[#940707]">Histórico Vazio</p>
                                                                <p className="text-xs">Os relatórios registrados aparecerão aqui após o download com confirmação.</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div className="pt-6 flex justify-end shrink-0">
                                <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-10 h-11 font-bold text-slate-500 border-slate-200 hover:bg-slate-50 transition-all">
                                    Fechar Histórico
                                </Button>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
