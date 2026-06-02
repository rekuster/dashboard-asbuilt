import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Info, AlertCircle, Image as ImageIcon, ExternalLink, X, Upload, Loader2 as LoaderIcon, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditApontamentoModal } from "./EditApontamentoModal";

/* 
 * ESTE É O MODAL DE CHECKLIST POR SALA.
 * Ele permite marcar quais disciplinas já foram verificadas "in loco".
 * Agora, ele também mostra se existem divergências (apontamentos) pendentes vindos do campo.
 * Adicionada funcionalidade de "Print de Verificação" para o modelo As-Built.
 */

interface VerificationModalProps {
    projectId: string;
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

export function VerificationModal({ projectId, isOpen, onClose, sala, disciplines, pendingApontamentos = {} }: VerificationModalProps) {
    const utils = trpc.useUtils();
    
    // Busca o status de verificação de cada disciplina para esta sala
    const { data: verifications = [] } = trpc.dashboard.getVerificacoes.useQuery(
        { salaId: sala?.id },
        { enabled: !!sala?.id }
    );

    // BUSCA DETALHADA DE APONTAMENTOS PARA MOSTRAR FOTOS
    const { data: allApontamentos = [] } = trpc.dashboard.getApontamentos.useQuery({ projectId });

    // Mutação para salvar/atualizar o status da checklist
    const upsertMutation = trpc.dashboard.upsertVerificacao.useMutation({
        onMutate: async (newVer) => {
            await utils.dashboard.getVerificacoes.cancel({ salaId: sala?.id });
            const previous = utils.dashboard.getVerificacoes.getData({ salaId: sala?.id });
            utils.dashboard.getVerificacoes.setData({ salaId: sala?.id }, (old: any) => {
                if (!old) return [{ ...newVer, id: Date.now() }];
                const exists = old.find((v: any) => v.disciplina === newVer.disciplina);
                if (exists) {
                    return old.map((v: any) => v.disciplina === newVer.disciplina ? { ...v, status: newVer.status } : v);
                }
                return [...old, { ...newVer, id: Date.now() }];
            });
            return { previous };
        },
        onError: (err, newVer, context) => {
            if (context?.previous) {
                utils.dashboard.getVerificacoes.setData({ salaId: sala?.id }, context.previous);
            }
        },
        onSettled: () => {
            utils.dashboard.getVerificacoes.invalidate({ salaId: sala?.id });
        },
    });

    const [editingApontamentoId, setEditingApontamentoId] = useState<number | null>(null);
    const [asBuiltNota, setAsBuiltNota] = useState("");
    const [asBuiltPrintUrls, setAsBuiltPrintUrls] = useState<string[]>([]);
    const [asBuiltPrintUrlInput, setAsBuiltPrintUrlInput] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Mutação para salvar detalhes As-Built no apontamento
    const updateAsBuiltMutation = trpc.dashboard.updateApontamentoAsBuilt.useMutation({
        onMutate: async (newApont) => {
            await utils.dashboard.getApontamentos.cancel({ projectId });
            const previous = utils.dashboard.getApontamentos.getData({ projectId });
            utils.dashboard.getApontamentos.setData({ projectId }, (old: any) => {
                if (!old) return old;
                return old.map((a: any) => a.id === newApont.id ? { ...a, asBuiltNota: newApont.asBuiltNota, asBuiltPrintUrl: newApont.asBuiltPrintUrl, status: newApont.status || a.status } : a);
            });
            return { previous };
        },
        onError: (err, newApont, context) => {
            if (context?.previous) {
                utils.dashboard.getApontamentos.setData({ projectId }, context.previous);
            }
            toast.error("Erro ao salvar detalhes.");
        },
        onSuccess: () => {
            toast.success("Detalhes As-Built salvos!");
            setEditingApontamentoId(null);
            setAsBuiltNota("");
            setAsBuiltPrintUrls([]);
            setAsBuiltPrintUrlInput("");
        },
        onSettled: () => {
            utils.dashboard.getApontamentos.invalidate({ projectId });
        }
    });

    // Mutação otimista para atualização de status de apontamentos
    const updateApontamentoMutation = trpc.dashboard.updateApontamento.useMutation({
        onMutate: async (newApont) => {
            await utils.dashboard.getApontamentos.cancel({ projectId });
            const previous = utils.dashboard.getApontamentos.getData({ projectId });
            utils.dashboard.getApontamentos.setData({ projectId }, (old: any) => {
                if (!old) return old;
                return old.map((a: any) => a.id === newApont.id ? { ...a, status: newApont.status, dataResolvido: newApont.dataResolvido } : a);
            });
            return { previous };
        },
        onError: (err, newApont, context) => {
            if (context?.previous) {
                utils.dashboard.getApontamentos.setData({ projectId }, context.previous);
            }
            toast.error("Erro ao atualizar divergência.");
        },
        onSettled: () => {
            utils.dashboard.getApontamentos.invalidate({ projectId });
        }
    });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedApontamento, setSelectedApontamento] = useState<any>(null);

    const handleEditClick = (apont: any) => {
        setSelectedApontamento(apont);
        setIsEditModalOpen(true);
    };


    // Função para upload de imagem
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (data.success && data.url) {
                setAsBuiltPrintUrls(prev => [...prev, data.url]);
                toast.success("Imagem carregada com sucesso!");
            } else {
                toast.error("Erro ao carregar imagem.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erro na conexão com o servidor.");
        } finally {
            setIsUploading(false);
        }
    };

    // Alterna entre OK e PENDENTE na checklist
    const handleToggle = (disc: string, currentStatus: string) => {
        const newStatus = currentStatus === "OK" ? "ATIVA" : "OK";
        const currentVer = verifications.find((v: any) => v.disciplina === disc);
        upsertMutation.mutate({
            salaId: sala.id,
            disciplina: disc,
            status: newStatus,
            observacao: currentVer?.observacao || "",
            printUrl: currentVer?.printUrl || ""
        }, {
            onSuccess: () => toast.success(`${disc} atualizado!`)
        });
    };

    // Salva uma observação técnica para o apontamento
    const handleSaveAsBuilt = (id: number, currentStatus?: string) => {
        updateAsBuiltMutation.mutate({
            id,
            asBuiltNota,
            asBuiltPrintUrl: JSON.stringify(asBuiltPrintUrls),
            status: (asBuiltNota || asBuiltPrintUrls.length > 0) ? 'EM_REVISAO' : currentStatus
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] font-sans rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
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
                        
                        const roomApontamentos = allApontamentos.filter((a: any) => 
                            a.sala === sala?.nome && 
                            isSameDiscipline(a.disciplina, disc)
                        );
                        
                        const pendingCount = roomApontamentos.filter((a: any) => a.status === 'ATIVA' || a.status === 'EM_REVISAO').length;
                        
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
                                                onCheckedChange={() => handleToggle(disc, ver?.status || "ATIVA")}
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
                                                    isOk ? "bg-emerald-100 text-emerald-700 border-none" : "text-amber-600 bg-amber-50 border-amber-200"
                                                }`}
                                            >
                                                {isOk ? "Verificado" : "Ativa"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {pendingCount > 0 && (
                                    <div className="border-t border-amber-100 bg-white/60 p-4 space-y-6">
                                        <p className="text-[10px] uppercase font-black text-amber-500 tracking-widest mb-2">Detalhes das Divergências (Layout de Relatório):</p>
                                        <div className="flex flex-col gap-8">
                                            {roomApontamentos.map((apont: any, idx: number) => (
                                                <div key={apont.id} className="space-y-4 bg-white p-5 rounded-3xl border border-amber-100 shadow-md">
                                                    <div className="flex gap-4 items-start">
                                                        <Badge className={`${apont.status === 'RESOLVIDA' ? 'bg-emerald-500' : 'bg-amber-500'} h-8 w-8 rounded-full flex items-center justify-center p-0 shrink-0 text-white text-lg font-black shadow-lg`}>{idx + 1}</Badge>
                                                        <div className="flex-1 space-y-1">
                                                            <p className={`text-sm font-bold leading-relaxed italic ${apont.status === 'RESOLVIDA' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                                "{apont.divergencia}"
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                                                                    apont.status === 'RESOLVIDA' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 
                                                                    apont.status === 'EM_REVISAO' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                                                                    'text-amber-600 bg-amber-50 border-amber-200'
                                                                }`}>
                                                                    {apont.status || 'ATIVA'}
                                                                </Badge>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Responsável:</span>
                                                                    <span className="text-[10px] font-black text-slate-600 uppercase">
                                                                        {apont.responsavel || 'Não Definido'}
                                                                    </span>
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-6 w-6 text-slate-400 hover:text-[#940707] transition-colors"
                                                                    onClick={() => handleEditClick(apont)}
                                                                >
                                                                    <Pencil size={12} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className={`h-8 px-3 text-[10px] font-black uppercase rounded-full transition-all border ${
                                                                    apont.status === 'ATIVA' 
                                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                                                                        : 'text-amber-600 border-amber-100 hover:bg-amber-50'
                                                                }`}
                                                                onClick={() => {
                                                                    updateApontamentoMutation.mutate({
                                                                        id: apont.id,
                                                                        status: 'ATIVA',
                                                                        dataResolvido: null
                                                                    }, {
                                                                        onSuccess: () => toast.success("Divergência marcada como ATIVA")
                                                                    });
                                                                }}
                                                            >
                                                                Ativa
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className={`h-8 px-3 text-[10px] font-black uppercase rounded-full transition-all border ${
                                                                    apont.status === 'EM_REVISAO' 
                                                                        ? 'bg-blue-500 text-white border-blue-600 shadow-sm' 
                                                                        : 'text-blue-600 border-blue-100 hover:bg-blue-50'
                                                                }`}
                                                                onClick={() => {
                                                                    updateApontamentoMutation.mutate({
                                                                        id: apont.id,
                                                                        status: 'EM_REVISAO',
                                                                        dataResolvido: null
                                                                    }, {
                                                                        onSuccess: () => toast.success("Divergência enviada para REVISÃO")
                                                                    });
                                                                }}
                                                            >
                                                                Em Revisão
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className={`h-8 px-3 text-[10px] font-black uppercase rounded-full transition-all border ${
                                                                    apont.status === 'RESOLVIDA' 
                                                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                                                                        : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                                                                }`}
                                                                onClick={() => {
                                                                    updateApontamentoMutation.mutate({
                                                                        id: apont.id,
                                                                        status: 'RESOLVIDA',
                                                                        dataResolvido: new Date()
                                                                    }, {
                                                                        onSuccess: () => toast.success("Divergência marcada como RESOLVIDA")
                                                                    });
                                                                }}
                                                            >
                                                                Resolvida
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tight flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-[#940707] rounded-full"></div>
                                                                    Projeto / Referência RA
                                                                </div>
                                                            </div>
                                                            <div className="h-[450px] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner group">
                                                                {apont.fotoReferenciaUrl ? (
                                                                    <img src={apont.fotoReferenciaUrl} alt="Referência" className="w-full h-full object-contain bg-slate-200 hover:scale-[1.02] transition-all duration-500 cursor-zoom-in" 
                                                                        onClick={() => window.open(apont.fotoReferenciaUrl, '_blank')}/>
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 italic gap-2">
                                                                        <ImageIcon className="w-8 h-8 opacity-20" />
                                                                        Sem imagem de referência
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tight flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                                                    Execução Real / Obra
                                                                </div>
                                                            </div>
                                                            <div className="h-[450px] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner group">
                                                                {apont.fotoUrl ? (
                                                                    <img src={apont.fotoUrl} alt="Campo" className="w-full h-full object-contain bg-slate-200 hover:scale-[1.02] transition-all duration-500 cursor-zoom-in" 
                                                                        onClick={() => window.open(apont.fotoUrl, '_blank')}/>
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 italic gap-2">
                                                                        <ImageIcon className="w-8 h-8 opacity-20" />
                                                                        Sem foto de campo
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* SEÇÃO AS-BUILT POR APONTAMENTO */}
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        {editingApontamentoId === apont.id ? (
                                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nota Técnica As-Built</label>
                                                                        <Textarea 
                                                                            placeholder="Descreva a solução aplicada no As-Built..."
                                                                            value={asBuiltNota}
                                                                            onChange={(e) => setAsBuiltNota(e.target.value)}
                                                                            className="text-xs min-h-[80px] rounded-xl border-slate-200 focus:ring-[#940707] focus:border-[#940707] bg-white"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Prints de Verificação (Modelo)</label>
                                                                        <div className="space-y-3">
                                                                            <div className="flex gap-2">
                                                                                <Input 
                                                                                    placeholder="Adicionar URL manualmente..."
                                                                                    value={asBuiltPrintUrlInput}
                                                                                    onChange={(e) => setAsBuiltPrintUrlInput(e.target.value)}
                                                                                    className="text-xs h-9 rounded-lg border-slate-200 bg-white"
                                                                                />
                                                                                <Button 
                                                                                    variant="outline" 
                                                                                    size="sm" 
                                                                                    className="h-9"
                                                                                    onClick={() => {
                                                                                        if (asBuiltPrintUrlInput) {
                                                                                            setAsBuiltPrintUrls(prev => [...prev, asBuiltPrintUrlInput]);
                                                                                            setAsBuiltPrintUrlInput("");
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    Adicionar
                                                                                </Button>
                                                                                <div className="relative">
                                                                                    <input 
                                                                                        type="file" 
                                                                                        id={`file-${apont.id}`} 
                                                                                        className="hidden" 
                                                                                        onChange={handleFileUpload}
                                                                                    />
                                                                                    <Button variant="outline" size="icon" className="h-9 w-9" asChild>
                                                                                        <label htmlFor={`file-${apont.id}`}>
                                                                                            {isUploading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                                                        </label>
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                            {asBuiltPrintUrls.length > 0 && (
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {asBuiltPrintUrls.map((url, i) => (
                                                                                        <div key={i} className="relative aspect-video w-32 rounded-xl overflow-hidden border border-slate-200 group">
                                                                                            <img src={url} className="w-full h-full object-cover" />
                                                                                            <button 
                                                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                                onClick={() => setAsBuiltPrintUrls(prev => prev.filter((_, idx) => idx !== i))}
                                                                                            >
                                                                                                <X className="w-3 h-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="sm" variant="ghost" onClick={() => setEditingApontamentoId(null)}>Cancelar</Button>
                                                                    <Button size="sm" onClick={() => handleSaveAsBuilt(apont.id, apont.status)} className="bg-[#940707] text-white">Salvar Verificação</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {(apont.asBuiltNota || apont.asBuiltPrintUrl) && (() => {
                                                                    let urls: string[] = [];
                                                                    try {
                                                                        const parsed = JSON.parse(apont.asBuiltPrintUrl || "[]");
                                                                        urls = Array.isArray(parsed) ? parsed : (apont.asBuiltPrintUrl ? [apont.asBuiltPrintUrl] : []);
                                                                    } catch (e) {
                                                                        urls = apont.asBuiltPrintUrl ? [apont.asBuiltPrintUrl] : [];
                                                                    }
                                                                    
                                                                    return (
                                                                    <div className="bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/50">
                                                                        {apont.asBuiltNota && (
                                                                            <p className="text-xs text-slate-600 italic mb-2 flex gap-2">
                                                                                <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                                {apont.asBuiltNota}
                                                                            </p>
                                                                        )}
                                                                        {urls.length > 0 && (
                                                                            <div className="flex gap-2 flex-wrap mt-2">
                                                                                {urls.map((url, i) => (
                                                                                    <div key={i} className="max-w-[300px] aspect-video rounded-lg overflow-hidden border border-emerald-200 shadow-sm cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                                                                                        <img src={url} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );})()}
                                                                <button 
                                                                    className="text-[10px] font-bold text-[#940707] hover:underline flex items-center gap-1.5"
                                                                    onClick={() => {
                                                                        setEditingApontamentoId(apont.id);
                                                                        setAsBuiltNota(apont.asBuiltNota || "");
                                                                        try {
                                                                            const parsed = JSON.parse(apont.asBuiltPrintUrl || "[]");
                                                                            setAsBuiltPrintUrls(Array.isArray(parsed) ? parsed : (apont.asBuiltPrintUrl ? [apont.asBuiltPrintUrl] : []));
                                                                        } catch (e) {
                                                                            setAsBuiltPrintUrls(apont.asBuiltPrintUrl ? [apont.asBuiltPrintUrl] : []);
                                                                        }
                                                                        setAsBuiltPrintUrlInput("");
                                                                    }}
                                                                >
                                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                                    {apont.asBuiltNota || apont.asBuiltPrintUrl ? "✎ Editar Verificação As-Built" : "+ Adicionar Nota Técnica e Print As-Built"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="p-4 bg-slate-50/30 border-t border-slate-100">
                                    {/* Nota de verificação da disciplina removida conforme solicitação do usuário para ser individual por apontamento */}
                                    <div className="text-[10px] text-slate-400 italic">
                                        As notas técnicas agora são vinculadas individualmente a cada divergência acima.
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <Button onClick={onClose} className="bg-[#940707] hover:bg-[#7a0606] text-white rounded-full px-10 h-10 shadow-lg shadow-[#940707]/20 font-bold">
                        Concluir Verificação
                    </Button>
                </DialogFooter>

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
            </DialogContent>
        </Dialog>
    );
}
