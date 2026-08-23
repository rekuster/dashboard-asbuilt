import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VerificationReportDialogProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    edificacoes: string[];
    disciplinas: string[];
}

export function VerificationReportDialog({
    projectId,
    isOpen,
    onClose,
    edificacoes,
    disciplinas,
}: VerificationReportDialogProps) {
    const [edificacao, setEdificacao] = useState("Todas");
    const [disciplina, setDisciplina] = useState("Todas");
    const [isGenerating, setIsGenerating] = useState(false);

    const getReportMutation = trpc.dashboard.getVerificationReport.useMutation({
        onSuccess: (base64) => {
            const link = document.createElement("a");
            link.href = `data:application/pdf;base64,${base64}`;
            link.download = `Relatorio_Verificacao_${new Date().getTime()}.pdf`;
            link.click();
            toast.success("Relatório gerado com sucesso!");
            setIsGenerating(false);
            onClose();
        },
        onError: (err) => {
            toast.error("Erro ao gerar relatório: " + err.message);
            setIsGenerating(false);
        },
    });

    const handleGenerate = () => {
        setIsGenerating(true);
        getReportMutation.mutate({
            projectId,
            edificacao: edificacao === "Todas" ? undefined : edificacao,
            disciplina: disciplina === "Todas" ? undefined : disciplina,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="bg-slate-50 border-b border-slate-100 p-6">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                        <FileDown className="w-5 h-5 text-[#940707]" />
                        Exportar Relatório de Verificação (PDF)
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Edificação</Label>
                        <Select value={edificacao} onValueChange={setEdificacao}>
                            <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todas">Todas as Edificações</SelectItem>
                                {edificacoes.map((e) => (
                                    <SelectItem key={e} value={e}>
                                        {e}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Disciplina</Label>
                        <Select value={disciplina} onValueChange={setDisciplina}>
                            <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todas">Todas as Disciplinas</SelectItem>
                                {disciplinas.map((d) => (
                                    <SelectItem key={d} value={d}>
                                        {d}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="rounded-full text-xs">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="rounded-full bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold px-6"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Gerando PDF...
                            </>
                        ) : (
                            "Gerar Relatório"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
