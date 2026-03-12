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
    X,
    Trash2,
    Send,
    CalendarDays,
    List
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

interface ApontamentoItem {
    id: string;
    disciplina: string;
    disciplinaLabel: string;
    divergencia: string;
    fotoRA: File | null;
    fotoRAPreview: string | null;
    fotoReal: File | null;
    fotoRealPreview: string | null;
}

const DISCIPLINA_LABELS: Record<string, string> = {
    ARQ: "ARQ - Arquitetura",
    FORRO: "FORRO",
    EST: "EST - Estrutura",
    HID: "HID - Hidráulica",
    PCI: "PCI - Incêndio",
    ELE: "ELE - Elétrica",
    CLI: "CLI - Climatização",
    MET: "MET - Metálica",
    LOG: "LOG - Lógica",
    ELEMT: "ELEMT - Barramento e Média Tensão",
    SDAI: "SDAI - Detecção e Alarme",
    SPDA: "SPDA - Para-raios",
    UTI: "UTI - Utilidades",
};

function getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function FieldReportTab() {
    const [selectedEdificacao, setSelectedEdificacao] = useState<string>("");
    const [selectedPavimento, setSelectedPavimento] = useState<string>("");
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [disciplina, setDisciplina] = useState("");
    const [divergencia, setDivergencia] = useState("");

    // Date of verification
    const [dataVerificacao, setDataVerificacao] = useState(getTodayString());

    // Multiple Photos (RA + Real)
    const [fotoRA, setFotoRA] = useState<File | null>(null);
    const [fotoRAPreview, setFotoRAPreview] = useState<string | null>(null);
    const [fotoReal, setFotoReal] = useState<File | null>(null);
    const [fotoRealPreview, setFotoRealPreview] = useState<string | null>(null);

    // Batch apontamentos list
    const [apontamentosList, setApontamentosList] = useState<ApontamentoItem[]>([]);
    const [isSavingAll, setIsSavingAll] = useState(false);

    const [offlineQueue, setOfflineQueue] = useState<QueuedApontamento[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const utils = trpc.useUtils();

    // Mutations
    const createApontamento = trpc.dashboard.createApontamento.useMutation({
        onSuccess: () => {
            utils.dashboard.getKPIs.invalidate();
            utils.dashboard.getApontamentos.invalidate();
        },
        onError: (err) => {
            console.error("Error creating appointment:", err);
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
                await createApontamento.mutateAsync({
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

    // Add item to the local batch list (does NOT save to backend yet)
    const handleAddToList = () => {
        if (!selectedSala || !disciplina || !divergencia) {
            toast.error("Preencha todos os campos obrigatórios.");
            return;
        }

        const newItem: ApontamentoItem = {
            id: crypto.randomUUID(),
            disciplina,
            disciplinaLabel: DISCIPLINA_LABELS[disciplina] || disciplina,
            divergencia,
            fotoRA,
            fotoRAPreview,
            fotoReal,
            fotoRealPreview,
        };

        setApontamentosList(prev => [...prev, newItem]);
        toast.success("Apontamento adicionado à lista!");

        // Clear form fields but keep sala selected and date
        setDisciplina("");
        setDivergencia("");
        setFotoRA(null);
        setFotoRAPreview(null);
        setFotoReal(null);
        setFotoRealPreview(null);
    };

    const handleRemoveFromList = (id: string) => {
        setApontamentosList(prev => prev.filter(item => item.id !== id));
    };

    // Save ALL accumulated items to the backend
    const handleSaveAll = async () => {
        if (apontamentosList.length === 0) {
            toast.error("Nenhum apontamento na lista.");
            return;
        }

        setIsSavingAll(true);
        let successCount = 0;
        const dataISO = new Date(dataVerificacao + "T12:00:00").toISOString();

        for (const item of apontamentosList) {
            let finalFotoUrl: string | undefined = undefined;
            let finalFotoReferenciaUrl: string | undefined = undefined;

            // Upload photos if online
            if (isOnline && item.fotoRA) {
                const url = await uploadImage(item.fotoRA);
                if (url) finalFotoReferenciaUrl = url;
            }
            if (isOnline && item.fotoReal) {
                const url = await uploadImage(item.fotoReal);
                if (url) finalFotoUrl = url;
            }

            const payload = {
                data: dataISO,
                edificacao: selectedSala.edificacao,
                pavimento: selectedSala.pavimento,
                setor: selectedSala.setor,
                sala: selectedSala.nome,
                disciplina: item.disciplina,
                divergencia: item.divergencia,
                fotoUrl: finalFotoUrl,
                fotoReferenciaUrl: finalFotoReferenciaUrl,
            };

            if (isOnline) {
                try {
                    await createApontamento.mutateAsync(payload);
                    successCount++;
                } catch (e) {
                    console.error("Error saving apontamento:", e);
                    // Queue for offline
                    const queued: QueuedApontamento = {
                        id: crypto.randomUUID(),
                        salaId: selectedSala.id,
                        ...payload,
                        fotoBase64: item.fotoRAPreview || item.fotoRealPreview || undefined,
                    };
                    const updatedQueue = [...offlineQueue, queued];
                    setOfflineQueue(updatedQueue);
                    localStorage.setItem('field_report_queue', JSON.stringify(updatedQueue));
                }
            } else {
                const queued: QueuedApontamento = {
                    id: crypto.randomUUID(),
                    salaId: selectedSala.id,
                    ...payload,
                    fotoBase64: item.fotoRAPreview || item.fotoRealPreview || undefined,
                };
                const updatedQueue = [...offlineQueue, queued];
                setOfflineQueue(updatedQueue);
                localStorage.setItem('field_report_queue', JSON.stringify(updatedQueue));
                successCount++;
            }
        }

        setIsSavingAll(false);

        if (isOnline) {
            if (successCount === apontamentosList.length) {
                toast.success(`${successCount} apontamento(s) salvo(s) com sucesso!`);
            } else {
                toast.warning(`${successCount} salvo(s), ${apontamentosList.length - successCount} enviado(s) para fila offline.`);
            }
        } else {
            toast.warning(`Sem conexão. ${successCount} item(ns) salvo(s) localmente.`);
        }

        // Clear the list but keep the sala and date selected
        setApontamentosList([]);
    };

    // Warn if switching sala with pending items
    const handleSalaChange = (sala: any) => {
        if (apontamentosList.length > 0) {
            const confirmed = window.confirm(
                `Você tem ${apontamentosList.length} apontamento(s) não salvo(s) para "${selectedSala?.nome}". Deseja descartar e trocar de sala?`
            );
            if (!confirmed) return;
            setApontamentosList([]);
        }
        setSelectedSala(sala);
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
                                    handleSalaChange(null);
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
                                    handleSalaChange(null);
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
                                    onClick={() => handleSalaChange(sala)}
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
                            {/* Date of verification */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <CalendarDays className="w-4 h-4" />
                                    Data da Verificação
                                </Label>
                                <input
                                    type="date"
                                    className="w-full p-2 rounded-md border text-sm bg-background"
                                    value={dataVerificacao}
                                    onChange={(e) => setDataVerificacao(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Disciplina</Label>
                                <select
                                    className="w-full p-2 rounded-md border text-sm"
                                    value={disciplina}
                                    onChange={(e) => setDisciplina(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {Object.entries(DISCIPLINA_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
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
                                className="w-full h-12 text-lg gap-2"
                                variant="outline"
                                onClick={handleAddToList}
                            >
                                <PlusCircle className="w-5 h-5" />
                                Adicionar à Lista
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Accumulated Items List */}
                    {apontamentosList.length > 0 && (
                        <Card className="shadow-md border-primary/20 animate-in slide-in-from-bottom-4 duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <List className="w-5 h-5 text-primary" />
                                    Lista de Apontamentos
                                    <span className="ml-auto text-sm font-normal bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                                        {apontamentosList.length}
                                    </span>
                                </CardTitle>
                                <CardDescription>
                                    Sala: <strong>{selectedSala.nome}</strong> · Data: <strong>{dataVerificacao.split('-').reverse().join('/')}</strong>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {apontamentosList.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-muted group"
                                    >
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                    {item.disciplinaLabel}
                                                </span>
                                                {(item.fotoRAPreview || item.fotoRealPreview) && (
                                                    <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <p className="text-sm text-foreground/80 line-clamp-2">{item.divergencia}</p>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="flex-shrink-0 h-7 w-7 opacity-50 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => handleRemoveFromList(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}

                                <Button
                                    className="w-full h-12 text-lg gap-2 mt-2"
                                    onClick={handleSaveAll}
                                    disabled={isSavingAll}
                                >
                                    {isSavingAll ? (
                                        <>
                                            <RefreshCcw className="w-5 h-5 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Salvar Todos ({apontamentosList.length} apontamento{apontamentosList.length > 1 ? 's' : ''})
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
