import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, MapPin, Building2, Layers, Tag, User, AlertCircle, Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EditApontamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    apontamento: any;
}

export function EditApontamentoModal({ isOpen, onClose, apontamento }: EditApontamentoModalProps) {
    const utils = trpc.useUtils();
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery();

    const [formData, setFormData] = useState<any>({
        edificacao: "",
        pavimento: "",
        setor: "",
        sala: "",
        disciplina: "",
        responsavel: "",
        divergencia: "",
        prioridade: "NORMAL",
        status: "ATIVA",
    });

    const [roomSearch, setRoomSearch] = useState("");

    useEffect(() => {
        if (apontamento) {
            setFormData({
                edificacao: apontamento.edificacao || "",
                pavimento: apontamento.pavimento || "",
                setor: apontamento.setor || "",
                sala: apontamento.sala || "",
                disciplina: apontamento.disciplina || "",
                responsavel: apontamento.responsavel || "",
                divergencia: apontamento.divergencia || "",
                prioridade: apontamento.prioridade || "NORMAL",
                status: apontamento.status || "ATIVA",
            });
            setRoomSearch(apontamento.sala || "");
        }
    }, [apontamento]);

    const updateMutation = trpc.dashboard.updateApontamento.useMutation({
        onSuccess: () => {
            toast.success("Apontamento atualizado com sucesso!");
            utils.dashboard.getApontamentos.invalidate();
            utils.dashboard.getKPIs.invalidate();
            onClose();
        },
        onError: (err) => {
            toast.error("Erro ao atualizar apontamento: " + err.message);
        }
    });

    const filteredSalas = useMemo(() => {
        if (!roomSearch) return [];
        return salas.filter(s => 
            s.nome.toLowerCase().includes(roomSearch.toLowerCase()) ||
            s.numeroSala.includes(roomSearch)
        ).slice(0, 5);
    }, [salas, roomSearch]);

    const handleSelectRoom = (room: any) => {
        setFormData(prev => ({
            ...prev,
            edificacao: room.edificacao,
            pavimento: room.pavimento,
            setor: room.setor,
            sala: room.nome
        }));
        setRoomSearch(room.nome);
    };

    const handleSave = () => {
        if (!formData.sala || !formData.disciplina) {
            toast.error("Sala e Disciplina são obrigatórios.");
            return;
        }
        updateMutation.mutate({
            id: apontamento.id,
            ...formData
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] rounded-3xl overflow-hidden p-0 border-none shadow-2xl font-sans">
                <DialogHeader className="px-8 py-6 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                        <div className="bg-[#940707] p-2 rounded-xl shadow-lg shadow-[#940707]/20">
                            <Tag className="w-5 h-5 text-white" />
                        </div>
                        Editar Apontamento #{apontamento?.numeroApontamento}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                    {/* Localização Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            Localização do Item
                        </h3>
                        
                        <div className="relative">
                            <Label className="text-xs font-bold text-slate-600 mb-1.5 block">Buscar Sala</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder="Digite o nome ou número da sala..."
                                    className="pl-9 h-11 rounded-xl border-slate-200 focus:ring-[#940707] focus:border-[#940707]"
                                    value={roomSearch}
                                    onChange={(e) => setRoomSearch(e.target.value)}
                                />
                            </div>
                            
                            {filteredSalas.length > 0 && roomSearch !== formData.sala && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    {filteredSalas.map(s => (
                                        <button
                                            key={s.id}
                                            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-none"
                                            onClick={() => handleSelectRoom(s)}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{s.nome}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-medium">{s.edificacao} • {s.pavimento}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] font-bold">Nº {s.numeroSala}</Badge>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Edificação</Label>
                                <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                                    <Building2 className="w-4 h-4" />
                                    {formData.edificacao || "—"}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Pavimento</Label>
                                <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                                    <Layers className="w-4 h-4" />
                                    {formData.pavimento || "—"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Detalhes Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" />
                            Informações da Divergência
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Disciplina</Label>
                                <Input 
                                    value={formData.disciplina}
                                    onChange={(e) => setFormData({...formData, disciplina: e.target.value})}
                                    className="h-10 rounded-xl border-slate-200"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Responsável</Label>
                                <Select 
                                    value={formData.responsavel} 
                                    onValueChange={(v) => setFormData({...formData, responsavel: v})}
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Thá">Thá</SelectItem>
                                        <SelectItem value="Ocle">Ocle</SelectItem>
                                        <SelectItem value="Stecla">Stecla</SelectItem>
                                        <SelectItem value="Instaladora">Instaladora</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Divergência / Descrição</Label>
                            <Textarea 
                                value={formData.divergencia}
                                onChange={(e) => setFormData({...formData, divergencia: e.target.value})}
                                className="min-h-[100px] rounded-xl border-slate-200 resize-none text-sm leading-relaxed"
                                placeholder="Descreva o problema encontrado..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Prioridade</Label>
                                <Select 
                                    value={formData.prioridade} 
                                    onValueChange={(v) => setFormData({...formData, prioridade: v})}
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BAIXA">Baixa</SelectItem>
                                        <SelectItem value="NORMAL">Normal</SelectItem>
                                        <SelectItem value="ALTA">Alta</SelectItem>
                                        <SelectItem value="URGENTE">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Status Atual</Label>
                                <Select 
                                    value={formData.status} 
                                    onValueChange={(v) => setFormData({...formData, status: v})}
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ATIVA">Ativa</SelectItem>
                                        <SelectItem value="EM_REVISAO">Em Revisão</SelectItem>
                                        <SelectItem value="RESOLVIDA">Resolvida</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="rounded-full px-6 font-bold text-slate-500">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={updateMutation.isPending}
                        className="bg-[#940707] hover:bg-[#7a0606] text-white rounded-full px-8 font-bold shadow-lg shadow-[#940707]/20 min-w-[140px]"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : "Salvar Alterações"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: "outline", className?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full border ${className}`}>
            {children}
        </span>
    );
}
