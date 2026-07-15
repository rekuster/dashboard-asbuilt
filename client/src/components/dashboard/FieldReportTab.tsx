import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
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
import { useProjectRole } from "@/hooks/useProjectRole";
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
    List,
    Lock
} from "lucide-react";

import { toast } from "sonner";

interface QueuedApontamento {
    id: string; // Temp local ID
    projectId?: string; // Project scope
    salaId: number;
    edificacao: string;
    pavimento: string;
    setor: string;
    sala: string;
    disciplina: string;
    divergencia: string;
    fotoRABase64?: string; // For offline storage
    fotoRealBase64?: string; // For offline storage
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

function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export default function FieldReportTab({ projectId }: { projectId: string }) {
    const { isEditor, isLoading: roleLoading } = useProjectRole(projectId);
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

    // Buscar apontamentos já existentes para a sala selecionada
    const { data: existingApontamentos = [], refetch: refetchExisting } = trpc.dashboard.getApontamentosBySala.useQuery(
        { projectId, sala: selectedSala?.nome || "" },
        { enabled: !!selectedSala }
    );

    const deleteApontamentoMutation = trpc.dashboard.deleteApontamento.useMutation({
        onSuccess: () => {
            toast.success("Apontamento excluído e renumerado!");
            refetchExisting();
            utils.dashboard.getKPIs.invalidate();
            utils.dashboard.getApontamentos.invalidate();
        },
        onError: (err) => {
            toast.error("Erro ao excluir apontamento.");
            console.error(err);
        }
    });

    const handleDeleteExisting = async (id: number) => {
        if (window.confirm("Tem certeza que deseja excluir este apontamento? A numeração de todos os outros desta sala será ajustada automaticamente.")) {
            await deleteApontamentoMutation.mutateAsync({ id });
        }
    };

    // Fetch data
    const { data: edificacoes = [] } = trpc.dashboard.getEdificacoes.useQuery({ projectId });
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery({ projectId });

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
        let successIds: string[] = [];

        for (const item of offlineQueue) {
            try {
                let finalFotoReferenciaUrl = item.fotoReferenciaUrl;
                let finalFotoUrl = item.fotoUrl;

                // Sincronizar foto de referência (RA) offline
                if (item.fotoRABase64 && !finalFotoReferenciaUrl) {
                    try {
                        const blob = dataURLtoBlob(item.fotoRABase64);
                        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
                        const filePath = `apontamentos/referencias/${fileName}`;
                        
                        const { error: uploadError } = await supabase.storage
                            .from('project-assets')
                            .upload(filePath, blob, { contentType: 'image/jpeg' });
                        
                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('project-assets')
                                .getPublicUrl(filePath);
                            finalFotoReferenciaUrl = publicUrl;
                        } else {
                            console.error("Error uploading offline fotoRA:", uploadError);
                        }
                    } catch (uploadEx) {
                        console.error("Exception uploading offline fotoRA:", uploadEx);
                    }
                }

                // Sincronizar foto real (Obra) offline
                if (item.fotoRealBase64 && !finalFotoUrl) {
                    try {
                        const blob = dataURLtoBlob(item.fotoRealBase64);
                        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
                        const filePath = `apontamentos/real/${fileName}`;
                        
                        const { error: uploadError } = await supabase.storage
                            .from('project-assets')
                            .upload(filePath, blob, { contentType: 'image/jpeg' });
                        
                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('project-assets')
                                .getPublicUrl(filePath);
                            finalFotoUrl = publicUrl;
                        } else {
                            console.error("Error uploading offline fotoReal:", uploadError);
                        }
                    } catch (uploadEx) {
                        console.error("Exception uploading offline fotoReal:", uploadEx);
                    }
                }

                await createApontamento.mutateAsync({
                    projectId: item.projectId, // Added projectId
                    data: item.data,
                    edificacao: item.edificacao,
                    pavimento: item.pavimento,
                    setor: item.setor,
                    sala: item.sala,
                    disciplina: item.disciplina,
                    divergencia: item.divergencia,
                    fotoUrl: finalFotoUrl,
                    fotoReferenciaUrl: finalFotoReferenciaUrl
                });
                successIds.push(item.id);
                // Pequeno atraso para não sobrecarregar a rede móvel
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error("Sync failed for item", item.id, e);
            }
        }

        const remaining = offlineQueue.filter(item => !successIds.includes(item.id));
        setOfflineQueue(remaining);
        localStorage.setItem('field_report_queue', JSON.stringify(remaining));

        if (remaining.length === 0) {
            toast.success("Sincronização completa!");
            refetchExisting();
        } else {
            toast.warning(`${successIds.length} sincronizados, ${remaining.length} falharam e continuam na fila.`);
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

    const compressImage = (file: File, maxWidth = 900): Promise<string> => {
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

                    // Compress to JPEG with 0.6 quality (safer for Vercel/mobile)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const uploadImage = async (file: File, type: 'real' | 'referencias' = 'real'): Promise<string | null> => {
        try {
            // 1. Compress image to Base64 first
            const base64Data = await compressImage(file);
            // 2. Convert Base64 back to a Blob for uploading
            const blob = dataURLtoBlob(base64Data);
            
            // 3. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `apontamentos/${type}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg'
                });

            if (uploadError) {
                throw uploadError;
            }

            // 4. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('project-assets')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (e: any) {
            console.error("Upload error:", e);
            toast.error(`Erro ao enviar foto: ${e.message}`);
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
                const url = await uploadImage(item.fotoRA, 'referencias');
                if (url) finalFotoReferenciaUrl = url;
            }
            if (isOnline && item.fotoReal) {
                const url = await uploadImage(item.fotoReal, 'real');
                if (url) finalFotoUrl = url;
            }

            const payload = {
                projectId: selectedSala.projectId, // Added projectId
                data: dataISO,
                edificacao: selectedSala.edificacao,
                pavimento: selectedSala.pavimento,
                setor: selectedSala.setor,
                sala: selectedSala.nome,
                disciplina: item.disciplina,
                divergencia: item.divergencia,
                fotoUrl: finalFotoUrl,
                fotoReferenciaUrl: finalFotoReferenciaUrl,
                status: 'ATIVA',
            };

            if (isOnline) {
                try {
                    await createApontamento.mutateAsync(payload);
                    successCount++;
                    // Pequeno atraso para garantir que cada requisição termine bem
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    console.error("Error saving apontamento:", e);
                    // Queue for offline
                    const queued: QueuedApontamento = {
                        id: crypto.randomUUID(),
                        salaId: selectedSala.id,
                        ...payload,
                        fotoRABase64: item.fotoRAPreview || undefined,
                        fotoRealBase64: item.fotoRealPreview || undefined,
                    };
                    const savedQueue = localStorage.getItem('field_report_queue');
                    const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
                    const updatedQueue = [...currentQueue, queued];
                    setOfflineQueue(updatedQueue);
                    localStorage.setItem('field_report_queue', JSON.stringify(updatedQueue));
                }
            } else {
                const queued: QueuedApontamento = {
                    id: crypto.randomUUID(),
                    salaId: selectedSala.id,
                    ...payload,
                    fotoRABase64: item.fotoRAPreview || undefined,
                    fotoRealBase64: item.fotoRealPreview || undefined,
                };
                const savedQueue = localStorage.getItem('field_report_queue');
                const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
                const updatedQueue = [...currentQueue, queued];
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

    if (roleLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <RefreshCcw className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Carregando permissões...</p>
            </div>
        );
    }

    if (!isEditor) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                <div className="h-16 w-16 rounded-full bg-slate-100/50 flex items-center justify-center text-slate-400 mb-4 border border-slate-200/50 shadow-inner backdrop-blur-sm">
                    <Lock className="h-7 w-7 text-rose-500 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-foreground">Acesso Restrito</h3>
                <p className="text-muted-foreground text-xs mt-2 leading-relaxed max-w-xs">
                    Esta aba é destinada ao relato de divergências em campo e é restrita a <strong>Editores</strong> e <strong>Administradores</strong> do projeto.
                </p>
            </div>
        );
    }

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

                            {/* Histórico da Sala (Já Salvos) */}
                            {selectedSala && (
                                <Card className="shadow-md border-slate-200">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-slate-500" />
                                            Apontamentos Existentes
                                            {existingApontamentos.length > 0 && (
                                                <span className="ml-2 text-sm font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                    {existingApontamentos.length}
                                                </span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {existingApontamentos.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic text-sm">
                                                Nenhum apontamento registrado para esta sala ainda.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {existingApontamentos.map((ap: any) => (
                                                    <div key={ap.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black">
                                                            {ap.numeroApontamento}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                                                    {ap.disciplina}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {new Date(ap.data).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 leading-snug">{ap.divergencia}</p>
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="flex-shrink-0 h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteExisting(ap.id)}
                                                            disabled={deleteApontamentoMutation.isPending}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

