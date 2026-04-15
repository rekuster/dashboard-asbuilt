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

// MAPEAMENTO DE DISCIPLINAS (REPLICADO PARA O MODAL)
const DISCIPLINE_MAPPING: Record<string, string> = {
    'ELE': 'Instalações Elétricas',
    'LOG': 'CFTV e Lógica',
    'HID': 'Instalações Hidrossanitárias',
    'UTI': 'Utilidades',
    'CLI': 'Climatização',
    'EST': 'Estrutura de Concreto',
    'MET': 'Estrutura Metálica',
    'ARQ': 'Arquitetura',
    'ELEMT': 'Média Tensão e Barramentos',
    'PCI': 'PCI',
    'SDAI': 'SDAI'
};

const isSameDiscipline = (apontamentoDisc: string, escopoDisc: string) => {
    const a = (apontamentoDisc || "").trim().toUpperCase();
    const e = (escopoDisc || "").trim().toUpperCase();
    if (a === e) return true;
    const mapped = DISCIPLINE_MAPPING[a];
    return mapped && mapped.toUpperCase() === e;
};

export function VerificationModal({ isOpen, onClose, sala, disciplines, pendingApontamentos = {} }: VerificationModalProps) {
    const utils = trpc.useUtils();
    
    // Busca o status de verificação de cada disciplina para esta sala
    const { data: verifications = [] } = trpc.dashboard.getVerificacoes.useQuery(
        { salaId: sala?.id },
        { enabled: !!sala?.id }
    );

    // BUSCA DETALHADA DE APONTAMENTOS PARA MOSTRAR FOTOS
    const { data: allApontamentos = [] } = trpc.dashboard.getApontamentos.useQuery();

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
            <DialogContent className="sm:max-w-[700px] font-sans rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="px-6 py-4 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <CheckCircle2 className="w-6 h-6 text-[#940707]" />
                        Checklist As-Built: {sala?.nome}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        Verifique a conformidade para a sala {sala?.numeroSala} ({sala?.edificacao}).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {disciplines.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                            <Info className="w-8 h-8 text-slate-300" />
                            <p className="text-sm text-slate-400 italic">Nenhuma disciplina mapeada para esta edificação.</p>
                        </div>
                    )}
                    
                    {disciplines.map((disc) => {
                        const ver = verifications.find((v: any) => v.disciplina === disc);
                        const isOk = ver?.status === "OK";
                        
                        // FILTRO PARA PEGAR OS APONTAMENTOS REAIS DESTA SALA E DISCIPLINA
                        const roomApontamentos = allApontamentos.filter((a: any) => 
                            a.sala === sala?.nome && 
                            isSameDiscipline(a.disciplina, disc) &&
                            a.status === 'PENDENTE'
                        );
                        
                        const pendingCount = roomApontamentos.length;
                        
                        return (
                            <div 
                                key={disc} 
                                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                                    pendingCount > 0 
                                        ? 'border-amber-200 bg-amber-50/20' 
                                        : isOk 
                                            ? 'border-emerald-100 bg-emerald-50/10' 
                                            : 'border-slate-100 bg-slate-50/50'
                                }`}
                            >
                                <div className="p-4 bg-white/40">
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
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        {pendingCount} DIVERGÊNCIA(S) ENCONTRADA(S)
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
                                                {isOk ? "Verificado" : "Pendente"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* LISTA DETALHADA COM FOTOS (REQUISIÇÃO DO USUÁRIO) */}
                                {pendingCount > 0 && (
                                    <div className="border-t border-amber-100 bg-white/60 p-4 space-y-4">
                                        <p className="text-[10px] uppercase font-black text-amber-500 tracking-widest mb-2">Detalhes das Divergências:</p>
                                        {roomApontamentos.map((apont, idx) => (
                                            <div key={apont.id} className="space-y-3 bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                                                <div className="flex gap-2 items-start">
                                                    <Badge className="bg-amber-500 h-5 w-5 rounded-full flex items-center justify-center p-0 shrink-0">{idx + 1}</Badge>
                                                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic">
                                                        "{apont.divergencia}"
                                                    </p>
                                                </div>

                                                {/* Comparativo de Imagens */}
                                                <div className="grid grid-cols-2 gap-3 pt-1">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Projeto / Referência RA</p>
                                                        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                                            {apont.fotoReferenciaUrl ? (
                                                                <img src={apont.fotoReferenciaUrl} alt="Referência" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-zoom-in" 
                                                                    onClick={() => window.open(apont.fotoReferenciaUrl, '_blank')}/>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 italic">Sem imagem</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Execução Real / Obra</p>
                                                        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                                            {apont.fotoUrl ? (
                                                                <img src={apont.fotoUrl} alt="Campo" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-zoom-in" 
                                                                    onClick={() => window.open(apont.fotoUrl, '_blank')}/>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 italic">Sem imagem</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
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
