import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* 
 * ESTE É O MODAL DE CHECKLIST POR SALA.
 * Ele permite marcar quais disciplinas já foram verificadas "in loco".
 * Agora, ele também mostra se existem divergências (apontamentos) pendentes vindos do campo.
 */

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    sala: any; // Dados da sala selecionada
    disciplines: string[]; // Disciplinas exigidas para esta edificação
    pendingApontamentos?: Record<string, number>; // Mapa de divergências pendentes por disciplina
}

export function VerificationModal({ isOpen, onClose, sala, disciplines, pendingApontamentos = {} }: VerificationModalProps) {
    const utils = trpc.useUtils();
    
    // Busca o status de verificação de cada disciplina para esta sala
    const { data: verifications = [] } = trpc.dashboard.getVerificacoes.useQuery(
        { salaId: sala?.id },
        { enabled: !!sala?.id }
    );

    // Mutação para salvar/atualizar o status da checklist
    const upsertMutation = trpc.dashboard.upsertVerificacao.useMutation({
        onSuccess: () => {
            utils.dashboard.getVerificacoes.invalidate({ salaId: sala?.id });
        },
    });

    const [editingDisc, setEditingDisc] = useState<string | null>(null);
    const [obs, setObs] = useState("");

    // Alterna entre OK e PENDENTE na checklist
    const handleToggle = async (disc: string, currentStatus: string) => {
        const newStatus = currentStatus === "OK" ? "PENDENTE" : "OK";
        try {
            await upsertMutation.mutateAsync({
                salaId: sala.id,
                disciplina: disc,
                status: newStatus,
                observacao: verifications.find((v: any) => v.disciplina === disc)?.observacao || ""
            });
            toast.success(`${disc} atualizado!`);
        } catch (e) {
            toast.error("Erro ao atualizar o status.");
        }
    };

    // Salva uma observação técnica para a disciplina
    const handleSaveObs = async () => {
        if (!editingDisc) return;
        try {
            await upsertMutation.mutateAsync({
                salaId: sala.id,
                disciplina: editingDisc,
                status: verifications.find((v: any) => v.disciplina === editingDisc)?.status || "PENDENTE",
                observacao: obs
            });
            toast.success(`Observação salva para ${editingDisc}!`);
            setEditingDisc(null);
            setObs("");
        } catch (e) {
            toast.error("Erro ao salvar observação.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] font-sans rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <CheckCircle2 className="w-6 h-6 text-[#940707]" />
                        Checklist As-Built: {sala?.nome}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Verifique a conformidade dos modelos para a sala {sala?.numeroSala} ({sala?.edificacao}).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {disciplines.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                            <Info className="w-8 h-8 text-slate-300" />
                            <p className="text-sm text-slate-400 italic">Nenhuma disciplina mapeada para esta edificação.</p>
                        </div>
                    )}
                    
                    {disciplines.map((disc) => {
                        const ver = verifications.find((v: any) => v.disciplina === disc);
                        const isOk = ver?.status === "OK";
                        const pendingCount = pendingApontamentos[disc] || 0;
                        
                        return (
                            <div 
                                key={disc} 
                                className={`border rounded-2xl p-4 space-y-3 transition-all duration-300 ${
                                    pendingCount > 0 
                                        ? 'border-amber-200 bg-amber-50/30' 
                                        : isOk 
                                            ? 'border-emerald-100 bg-emerald-50/20' 
                                            : 'border-slate-100 bg-slate-50/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Checkbox 
                                            id={`check-${disc}`} 
                                            checked={isOk}
                                            onCheckedChange={() => handleToggle(disc, ver?.status || "PENDENTE")}
                                            className="w-5 h-5 rounded-md border-slate-300 data-[state=checked]:bg-[#940707] data-[state=checked]:border-[#940707]"
                                        />
                                        <div className="flex flex-col">
                                            <label htmlFor={`check-${disc}`} className="text-sm font-bold cursor-pointer text-slate-700">
                                                {disc}
                                            </label>
                                            {pendingCount > 0 && (
                                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    {pendingCount} divergência(s) pendente(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge 
                                            variant={isOk ? "secondary" : "outline"} 
                                            className={`rounded-full px-3 py-0.5 text-[10px] uppercase tracking-wider font-bold ${
                                                isOk ? "bg-emerald-100 text-emerald-700 border-none" : "text-slate-400 bg-white"
                                            }`}
                                        >
                                            {isOk ? "Verificado" : "Aguardando"}
                                        </Badge>
                                        {pendingCount > 0 && !disciplines.includes(disc) && (
                                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">
                                                Divergência de Campo
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {ver?.observacao && !editingDisc && (
                                    <div className="text-[11px] text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-100 italic flex gap-2 items-start shadow-sm">
                                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                                        {ver.observacao}
                                    </div>
                                )}

                                {editingDisc === disc ? (
                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <Textarea 
                                            placeholder="Descreva observações técnicas ou pendências..."
                                            value={obs}
                                            onChange={(e) => setObs(e.target.value)}
                                            className="text-xs min-h-[80px] rounded-xl border-slate-200 focus:ring-[#940707] focus:border-[#940707]"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSaveObs} className="h-8 px-4 text-xs bg-[#940707] hover:bg-[#7a0606] rounded-full text-white">
                                                Salvar Observação
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingDisc(null)} className="h-8 px-4 text-xs rounded-full">
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        className="text-[10px] font-bold text-[#940707] hover:underline flex items-center gap-1 mt-1 px-1"
                                        onClick={() => {
                                            setEditingDisc(disc);
                                            setObs(ver?.observacao || "");
                                        }}
                                    >
                                        {ver?.observacao ? "✎ Editar observação" : "+ Adicionar nota técnica"}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100">
                    <Button onClick={onClose} className="bg-[#940707] hover:bg-[#7a0606] text-white rounded-full px-8 shadow-lg shadow-[#940707]/20">
                        Concluir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
