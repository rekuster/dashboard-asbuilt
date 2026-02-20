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

    // Filters
    const [filterEdificacao, setFilterEdificacao] = useState("Todas");
    const [filterDisciplina, setFilterDisciplina] = useState("Todas");
    const [filterResponsavel, setFilterResponsavel] = useState("Todos");
    const [filterSala] = useState(""); // Keeping variable but without unused setter

    const utils = trpc.useUtils();

    const generatePreview = async () => {
        setIsLoading(true);
        setBase64Pdf(null);
        try {
            let base64 = "";
            const filters = {
                edificacao: filterEdificacao !== "Todas" ? filterEdificacao : undefined,
                disciplina: filterDisciplina !== "Todas" ? filterDisciplina : undefined,
                responsavel: filterResponsavel !== "Todos" ? filterResponsavel : undefined,
                sala: filterSala || undefined
            };

            if (reportType === "CQ") {
                base64 = await utils.dashboard.getPDFReport.fetch(filters);
            } else {
                // AsBuilt currently mostly supports edificacao, but we pass others just in case we update backend later
                base64 = await utils.dashboard.getAsBuiltReport.fetch({ edificacao: filters.edificacao });
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

    const downloadPDF = () => {
        if (!base64Pdf) return;
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64Pdf}`;
        link.download = `${reportType === 'CQ' ? 'Relatorio_Divergencias' : 'Relatorio_AsBuilt'}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
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

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 py-4 border-b">
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
                        <Select value={filterEdificacao} onValueChange={setFilterEdificacao}>
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

                    <div className="flex flex-col gap-2 justify-end">
                        <Button onClick={generatePreview} disabled={isLoading} className="w-full">
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
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Fechar</Button>
                    <Button onClick={downloadPDF} disabled={!base64Pdf}>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar PDF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
