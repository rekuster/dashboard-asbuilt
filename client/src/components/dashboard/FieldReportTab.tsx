import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Smartphone,
    CloudOff,
    RefreshCcw,
    MapPin,
    PlusCircle,
    ChevronRight,
    Camera,
    X
} from "lucide-react";

import { toast } from "sonner";

interface QueuedApontamento {
    id: string; // Temp local ID
    salaId: number;
    edificacao: string;
    pavimento: string;
    setor: string;
    sala: string;
    disciplina: string;
    divergencia: string;
    fotoBase64?: string; // For offline storage
    fotoUrl?: string; // For syncing
    fotoReferenciaUrl?: string; // For syncing reference photo
    data: string;
}

export default function FieldReportTab() {
    const [selectedEdificacao, setSelectedEdificacao] = useState<string>("");
    const [selectedPavimento, setSelectedPavimento] = useState<string>("");
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [disciplina, setDisciplina] = useState("");
    const [divergencia, setDivergencia] = useState("");

    // Multiple Photos (RA + Real)
    const [fotoRA, setFotoRA] = useState<File | null>(null);
    const [fotoRAPreview, setFotoRAPreview] = useState<string | null>(null);
    const [fotoReal, setFotoReal] = useState<File | null>(null);
    const [fotoRealPreview, setFotoRealPreview] = useState<string | null>(null);

    const [offlineQueue, setOfflineQueue] = useState<QueuedApontamento[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const utils = trpc.useUtils();

    // Mutations
    const createApontamento = trpc.dashboard.createApontamento.useMutation({
        onSuccess: () => {
            toast.success("Apontamento registrado com sucesso!");
            setDisciplina("");
            setDivergencia("");
            utils.dashboard.getKPIs.invalidate();
            utils.dashboard.getApontamentos.invalidate();
        },
        onError: (err) => {
            console.error("Error creating appointment:", err);
            toast.error("Erro ao salvar. O item foi para a fila offline.");
        }
    });

    // Fetch data
    const { data: edificacoes = [] } = trpc.dashboard.getEdificacoes.useQuery();
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery();

    const pavimentos = Array.from(new Set(
        (salas as any[]).filter(s => s.edificacao === selectedEdificacao).map(s => s.pavimento)
    )).sort() as string[];

    const filteredSalas = (salas as any[]).filter(s =>
        s.edificacao === selectedEdificacao &&
        s.pavimento === selectedPavimento
    ).sort((a, b) => a.nome.localeCompare(b.nome));

    // Offline management
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const savedQueue = localStorage.getItem('field_report_queue');
        if (savedQueue) {
            setOfflineQueue(JSON.parse(savedQueue));
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const syncQueue = async () => {
        if (offlineQueue.length === 0) return;

        toast.info(`Sincronizando ${offlineQueue.length} itens...`);
        let successCount = 0;

        for (const item of offlineQueue) {
            try {
                // Generate a "fake" number for now or handle on backend
                await createApontamento.mutateAsync({
                    numeroApontamento: Math.floor(Math.random() * 100000),
                    data: item.data,
                    edificacao: item.edificacao,
                    pavimento: item.pavimento,
                    setor: item.setor,
                    sala: item.sala,
                    disciplina: item.disciplina,
                    divergencia: item.divergencia,
                    fotoUrl: item.fotoUrl,
                    fotoReferenciaUrl: item.fotoReferenciaUrl
                });
                successCount++;
            } catch (e) {
                console.error("Sync failed for item", item.id, e);
            }
        }

        const remaining = offlineQueue.slice(successCount);
        setOfflineQueue(remaining);
        localStorage.setItem('field_report_queue', JSON.stringify(remaining));

        if (remaining.length === 0) {
            toast.success("Sincronização completa!");
        } else {
            toast.warning(`${successCount} sincronizados, ${remaining.length} falharam.`);
        }
    };

    const handlePhotoChange = (type: 'RA' | 'Real', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'RA') {
                    setFotoRA(file);
                    setFotoRAPreview(reader.result as string);
                } else {
                    setFotoReal(file);
                    setFotoRealPreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            return data.url;
        } catch (e) {
            console.error("Upload error:", e);
            return null;
        }
    };

    const handleAddApontamento = async () => {
        if (!selectedSala || !disciplina || !divergencia) {
            toast.error("Preencha todos os campos obrigatórios.");
            return;
        }

        let finalFotoUrl = undefined;
        let finalFotoReferenciaUrl = undefined;

        if (isOnline && fotoRA) {
            toast.info("Subindo foto Referência/RA...");
            const url = await uploadImage(fotoRA);
            if (url) finalFotoReferenciaUrl = url;
        }
        if (isOnline && fotoReal) {
            toast.info("Subindo foto Real...");
            const url = await uploadImage(fotoReal);
            if (url) finalFotoUrl = url;
        }

        const newApontamento = {
            numeroApontamento: Math.floor(Math.random() * 100000),
            data: new Date().toISOString(),
            edificacao: selectedSala.edificacao,
            pavimento: selectedSala.pavimento,
            setor: selectedSala.setor,
            sala: selectedSala.nome,
            disciplina,
            divergencia,
            fotoUrl: finalFotoUrl,
            fotoReferenciaUrl: finalFotoReferenciaUrl
        };

        if (isOnline) {
            createApontamento.mutate(newApontamento);
            setFotoRA(null); setFotoRAPreview(null);
            setFotoReal(null); setFotoRealPreview(null);
            setDisciplina("");
            setDivergencia("");
        } else {
            const queued: QueuedApontamento = {
                id: crypto.randomUUID(),
                salaId: selectedSala.id,
                ...newApontamento,
                fotoBase64: fotoRAPreview || fotoRealPreview || undefined
            };
            const updatedQueue = [...offlineQueue, queued];
            setOfflineQueue(updatedQueue);
            localStorage.setItem('field_report_queue', JSON.stringify(updatedQueue));
            toast.warning("Sem conexão. Item salvo localmente.");
            setDisciplina("");
            setDivergencia("");
            setFotoRA(null); setFotoRAPreview(null);
            setFotoReal(null); setFotoRealPreview(null);
        }
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-20">
            {/* Status Bar */}
            <div className={`flex items-center justify-between p-3 rounded-xl border ${isOnline ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-orange-50 border-orange-100 text-orange-700"
                }`}>
                <div className="flex items-center gap-2 font-medium">
                    {isOnline ? <Smartphone className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                    {isOnline ? "Online - Conectado ao PC" : "Modo Offline - Dados Salvos Local"}
                </div>
                {offlineQueue.length > 0 && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-2 bg-white/50 hover:bg-white"
                        onClick={syncQueue}
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Sync ({offlineQueue.length})
                    </Button>
                )}
            </div>

            {/* Room Selection */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Localização
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Edificação</Label>
                            <select
                                className="w-full p-2 rounded-md border text-sm"
                                value={selectedEdificacao}
                                onChange={(e) => {
                                    setSelectedEdificacao(e.target.value);
                                    setSelectedPavimento("");
                                    setSelectedSala(null);
                                }}
                            >
                                <option value="">Selecione...</option>
                                {edificacoes.map((ed: any) => <option key={ed} value={ed}>{ed}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Pavimento</Label>
                            <select
                                className="w-full p-2 rounded-md border text-sm"
                                value={selectedPavimento}
                                onChange={(e) => {
                                    setSelectedPavimento(e.target.value);
                                    setSelectedSala(null);
                                }}
                                disabled={!selectedEdificacao}
                            >
                                <option value="">Selecione...</option>
                                {pavimentos.map((p: string) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Sala</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {!selectedPavimento && (
                                <p className="text-xs text-muted-foreground italic">Selecione prédio e andar primeiro</p>
                            )}
                            {filteredSalas.map((sala: any) => (
                                <Button
                                    key={sala.id}
                                    variant={selectedSala?.id === sala.id ? "default" : "outline"}
                                    className="justify-between h-auto py-3 px-4 font-normal"
                                    onClick={() => setSelectedSala(sala)}
                                >
                                    <div className="text-left">
                                        <div className="font-bold">{sala.nome}</div>
                                        <div className="text-[10px] opacity-70 uppercase tracking-tighter">{sala.setor}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-30" />
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedSala && (
                <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                    {/* New Finding Form */}
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-primary" />
                                Adicionar Apontamento
                            </CardTitle>
                            <CardDescription>
                                Registre uma divergência encontrada na sala: <strong>{selectedSala.nome}</strong>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Disciplina</Label>
                                <select
                                    className="w-full p-2 rounded-md border text-sm"
                                    value={disciplina}
                                    onChange={(e) => setDisciplina(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="ARQ">Arquitetura</option>
                                    <option value="EST">Estrutura</option>
                                    <option value="HID">Hidráulica</option>
                                    <option value="ELE">Elétrica</option>
                                    <option value="CLI">Climatização</option>
                                    <option value="MET">Metálica</option>
                                    <option value="PCI">Incêndio</option>
                                    <option value="GAS">Gás</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Divergência / Apontamento</Label>
                                <Textarea
                                    placeholder="Descreva o que foi encontrado em campo..."
                                    className="min-h-[100px]"
                                    value={divergencia}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDivergencia(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                {/* Foto Referência */}
                                <div className="border-2 border-dashed rounded-lg p-2 bg-muted/30">
                                    <div className="text-[10px] font-bold text-center uppercase tracking-wider text-primary mb-1">Referência (RA/Modelo)</div>
                                    {fotoRAPreview ? (
                                        <div className="relative aspect-square rounded-md overflow-hidden bg-black flex items-center justify-center">
                                            <img src={fotoRAPreview} className="max-w-full max-h-full object-contain" alt="Referência" />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                                onClick={() => { setFotoRA(null); setFotoRAPreview(null); }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer py-3">
                                            <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                                            <div className="text-[10px]">Referência</div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={(e) => handlePhotoChange('RA', e)}
                                            />
                                        </label>
                                    )}
                                </div>
                                {/* Foto Real */}
                                <div className="border-2 border-dashed rounded-lg p-2 bg-muted/30">
                                    <div className="text-[10px] font-bold text-center uppercase tracking-wider text-emerald-600 mb-1">Foto Real (Campo)</div>
                                    {fotoRealPreview ? (
                                        <div className="relative aspect-square rounded-md overflow-hidden bg-black flex items-center justify-center">
                                            <img src={fotoRealPreview} className="max-w-full max-h-full object-contain" alt="Real" />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                                onClick={() => { setFotoReal(null); setFotoRealPreview(null); }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer py-3">
                                            <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                                            <div className="text-[10px]">Obra/Real</div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={(e) => handlePhotoChange('Real', e)}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-lg"
                                onClick={handleAddApontamento}
                                disabled={createApontamento.isPending}
                            >
                                {createApontamento.isPending ? "Salvando..." : "Salvar Apontamento"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
