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

    const compressImage = (file: File, maxWidth = 1024): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG with 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        try {
            // Now we don't upload to API, we just compress and return Base64
            // This bypasses the ephemeral filesystem issue on Vercel
            return await compressImage(file);
        } catch (e) {
            console.error("Compression error:", e);
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
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left Column: Room Selection (Column Span 5) */}
                <div className="md:col-span-5 space-y-6">
                    <Card className="shadow-sm sticky top-6">
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
                                <Label className="flex justify-between items-center">
                                    <span>Sala</span>
                                    {selectedPavimento && (
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{filteredSalas.length} Salas</span>
                                    )}
                                </Label>
                                <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {!selectedPavimento && (
                                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-lg">
                                            <p className="text-xs text-muted-foreground italic">Selecione prédio e andar primeiro</p>
                                        </div>
                                    )}
                                    {filteredSalas.map((sala: any) => (
                                        <Button
                                            key={sala.id}
                                            variant={selectedSala?.id === sala.id ? "default" : "outline"}
                                            className={`justify-between h-auto py-3 px-4 font-normal transition-all ${
                                                selectedSala?.id === sala.id ? "ring-2 ring-primary ring-offset-1" : "hover:border-primary/50"
                                            }`}
                                            onClick={() => handleSalaChange(sala)}
                                        >
                                            <div className="text-left">
                                                <div className="font-bold">{sala.nome}</div>
                                                <div className="text-[10px] opacity-70 uppercase tracking-tighter">{sala.setor}</div>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedSala?.id === sala.id ? "translate-x-1" : "opacity-30"}`} />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Form and List (Column Span 7) */}
                <div className="md:col-span-7 space-y-6">
                    {!selectedSala ? (
                        <Card className="h-64 border-dashed flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <MapPin className="w-8 h-8 text-primary opacity-40" />
                            </div>
                            <CardTitle className="text-slate-400">Nenhuma Sala Selecionada</CardTitle>
                            <CardDescription className="max-w-[250px] mx-auto mt-2">
                                Selecione uma sala à esquerda para começar a registrar apontamentos no campo.
                            </CardDescription>
                        </Card>
                    ) : (
                        <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                            {/* New Finding Form */}
                            <Card className="shadow-md border-t-4 border-t-primary">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <PlusCircle className="w-5 h-5 text-primary" />
                                                Adicionar Apontamento
                                            </CardTitle>
                                            <CardDescription>
                                                Registrando em: <strong className="text-foreground">{selectedSala.nome}</strong>
                                            </CardDescription>
                                        </div>
                                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleSalaChange(null)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Date of verification */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1.5">
                                            <CalendarDays className="w-4 h-4 text-primary" />
                                            Data da Verificação
                                        </Label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 rounded-md border text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={dataVerificacao}
                                            onChange={(e) => setDataVerificacao(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Disciplina</Label>
                                        <select
                                            className="w-full p-2.5 rounded-md border text-sm focus:ring-2 focus:ring-primary/20 outline-none"
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
                                            className="min-h-[120px] resize-none"
                                            value={divergencia}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDivergencia(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        {/* Foto Referência */}
                                        <div className="border-2 border-dashed rounded-xl p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="text-[10px] font-black text-center uppercase tracking-widest text-primary mb-2">Referência</div>
                                            {fotoRAPreview ? (
                                                <div className="relative aspect-square rounded-lg overflow-hidden bg-black flex items-center justify-center group">
                                                    <img src={fotoRAPreview} className="max-w-full max-h-full object-contain" alt="Referência" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            className="h-8 w-8 rounded-full"
                                                            onClick={() => { setFotoRA(null); setFotoRAPreview(null); }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center cursor-pointer py-4">
                                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                                                        <Camera className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div className="text-[10px] font-bold">Capturar RA</div>
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
                                        <div className="border-2 border-dashed rounded-xl p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="text-[10px] font-black text-center uppercase tracking-widest text-emerald-600 mb-2">Foto Obra</div>
                                            {fotoRealPreview ? (
                                                <div className="relative aspect-square rounded-lg overflow-hidden bg-black flex items-center justify-center group">
                                                    <img src={fotoRealPreview} className="max-w-full max-h-full object-contain" alt="Real" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            className="h-8 w-8 rounded-full"
                                                            onClick={() => { setFotoReal(null); setFotoRealPreview(null); }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center cursor-pointer py-4">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                                                        <Camera className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <div className="text-[10px] font-bold">Foto Real</div>
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
                                        className="w-full h-14 text-lg gap-3 shadow-lg shadow-primary/10"
                                        variant="default"
                                        onClick={handleAddToList}
                                    >
                                        <PlusCircle className="w-6 h-6" />
                                        ADICIONAR À LISTA
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Accumulated Items List */}
                            {apontamentosList.length > 0 && (
                                <Card className="shadow-md border-primary/20 bg-primary/[0.02] animate-in slide-in-from-bottom-4 duration-300">
                                    <CardHeader className="pb-3 border-b border-primary/5">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <List className="w-5 h-5 text-primary" />
                                                Itens para Salvar
                                                <span className="ml-2 text-sm font-black bg-primary text-white px-2 py-0.5 rounded-full">
                                                    {apontamentosList.length}
                                                </span>
                                            </CardTitle>
                                            <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => setApontamentosList([])}>
                                                Limpar
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-primary/5">
                                            {apontamentosList.map((item, index) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start gap-4 p-4 hover:bg-white transition-colors group"
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black ring-4 ring-primary/5">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-primary text-white">
                                                                {item.disciplinaLabel}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{item.divergencia}</p>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                                        onClick={() => handleRemoveFromList(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-white border-t border-primary/5 rounded-b-xl">
                                            <Button
                                                className="w-full h-14 text-lg gap-3"
                                                onClick={handleSaveAll}
                                                disabled={isSavingAll}
                                            >
                                                {isSavingAll ? (
                                                    <>
                                                        <RefreshCcw className="w-6 h-6 animate-spin" />
                                                        Salvando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-6 h-6" />
                                                        SINCRONIZAR AGORA ({apontamentosList.length})
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

