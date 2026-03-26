import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Download, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

    // Fetch pavimentos based on selected edificacao
    const { data: pavimentos = [] } = trpc.dashboard.getPavimentos.useQuery(
        { edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined },
        { enabled: isOpen }
    );

    const utils = trpc.useUtils();

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
                base64 = await utils.dashboard.getPDFReport.fetch(filters);
            } else {
                base64 = await utils.dashboard.getAsBuiltReport.fetch({ 
                    edificacao: filters.edificacao,
                    pavimento: filters.pavimento
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
                    dataToDownload = await utils.dashboard.getPDFReport.fetch(filters);
                } else {
                    dataToDownload = await utils.dashboard.getAsBuiltReport.fetch({ 
                        edificacao: filters.edificacao,
                        pavimento: filters.pavimento
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 py-4 border-b items-end">
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
                            setFilterPavimento("Todos"); // Reset floor when complex changes
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
                        <Button onClick={generatePreview} disabled={isLoading} className="w-full bg-red-800 hover:bg-red-900">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
                            Gerar Preview
                        </Button>
                    </div>
                </div>

                <div className="flex-1 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200 flex items-center justify-center">
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

                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
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
            </DialogContent>
        </Dialog>
    );
}
