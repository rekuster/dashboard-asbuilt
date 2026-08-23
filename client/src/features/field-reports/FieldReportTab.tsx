import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useProjectRole } from "@/hooks/useProjectRole";
import { toast } from "sonner";
import { Lock, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { DISCIPLINA_LABELS, getTodayString, dataURLtoBlob } from "./constants";
import { QueuedApontamento, ApontamentoItem } from "./types";
import { FieldReportHeader } from "./components/FieldReportHeader";
import { OfflineSyncBanner } from "./components/OfflineSyncBanner";
import { InspectionForm } from "./components/InspectionForm";
import { PendingBatchList } from "./components/PendingBatchList";
import { ExistingRoomIssuesList } from "./components/ExistingRoomIssuesList";

export default function FieldReportTab({ projectId }: { projectId: string }) {
    const { isEditor, isLoading: roleLoading } = useProjectRole(projectId);
    const [selectedEdificacao, setSelectedEdificacao] = useState<string>("");
    const [selectedPavimento, setSelectedPavimento] = useState<string>("");
    const [selectedSala, setSelectedSala] = useState<any>(null);
    const [disciplina, setDisciplina] = useState("");
    const [divergencia, setDivergencia] = useState("");

    const [dataVerificacao, setDataVerificacao] = useState(getTodayString());

    const [fotoRA, setFotoRA] = useState<File | null>(null);
    const [fotoRAPreview, setFotoRAPreview] = useState<string | null>(null);
    const [fotoReal, setFotoReal] = useState<File | null>(null);
    const [fotoRealPreview, setFotoRealPreview] = useState<string | null>(null);

    const [apontamentosList, setApontamentosList] = useState<ApontamentoItem[]>([]);
    const [isSavingAll, setIsSavingAll] = useState(false);

    const [offlineQueue, setOfflineQueue] = useState<QueuedApontamento[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const utils = trpc.useUtils();

    const createApontamento = trpc.dashboard.createApontamento.useMutation({
        onSuccess: () => {
            utils.dashboard.getKPIs.invalidate({ projectId });
            utils.dashboard.getApontamentos.invalidate({ projectId });
        },
    });

    const { data: existingApontamentos = [], refetch: refetchExisting } =
        trpc.dashboard.getApontamentosBySala.useQuery(
            { projectId, sala: selectedSala?.nome || "" },
            { enabled: !!selectedSala }
        );

    const deleteApontamentoMutation = trpc.dashboard.deleteApontamento.useMutation({
        onSuccess: () => {
            toast.success("Apontamento excluído!");
            refetchExisting();
            utils.dashboard.getKPIs.invalidate({ projectId });
            utils.dashboard.getApontamentos.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error("Erro ao excluir apontamento: " + err.message);
        },
    });

    const { data: edificacoes = [] } = trpc.dashboard.getEdificacoes.useQuery({
        projectId,
    });
    const { data: salas = [] } = trpc.dashboard.getSalas.useQuery({ projectId });

    const pavimentos = Array.from(
        new Set(
            (salas as any[])
                .filter((s) => s.edificacao === selectedEdificacao)
                .map((s) => s.pavimento)
        )
    ).sort() as string[];

    const filteredSalas = (salas as any[])
        .filter(
            (s) =>
                s.edificacao === selectedEdificacao && s.pavimento === selectedPavimento
        )
        .sort((a, b) => a.nome.localeCompare(b.nome));

    // Offline management
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        const savedQueue = localStorage.getItem("field_report_queue");
        if (savedQueue) {
            setOfflineQueue(JSON.parse(savedQueue));
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const syncQueue = async () => {
        if (offlineQueue.length === 0) return;

        toast.info(`Sincronizando ${offlineQueue.length} itens...`);
        const successIds: string[] = [];

        for (const item of offlineQueue) {
            try {
                let finalFotoReferenciaUrl = item.fotoReferenciaUrl;
                let finalFotoUrl = item.fotoUrl;

                if (item.fotoRABase64 && !finalFotoReferenciaUrl) {
                    try {
                        const blob = dataURLtoBlob(item.fotoRABase64);
                        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
                        const filePath = `apontamentos/referencias/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from("project-assets")
                            .upload(filePath, blob, { contentType: "image/jpeg" });

                        if (!uploadError) {
                            const {
                                data: { publicUrl },
                            } = supabase.storage.from("project-assets").getPublicUrl(filePath);
                            finalFotoReferenciaUrl = publicUrl;
                        }
                    } catch (uploadEx) {
                        console.error("Exception uploading offline fotoRA:", uploadEx);
                    }
                }

                if (item.fotoRealBase64 && !finalFotoUrl) {
                    try {
                        const blob = dataURLtoBlob(item.fotoRealBase64);
                        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
                        const filePath = `apontamentos/real/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from("project-assets")
                            .upload(filePath, blob, { contentType: "image/jpeg" });

                        if (!uploadError) {
                            const {
                                data: { publicUrl },
                            } = supabase.storage.from("project-assets").getPublicUrl(filePath);
                            finalFotoUrl = publicUrl;
                        }
                    } catch (uploadEx) {
                        console.error("Exception uploading offline fotoReal:", uploadEx);
                    }
                }

                await createApontamento.mutateAsync({
                    projectId: item.projectId || projectId,
                    data: item.data,
                    edificacao: item.edificacao,
                    pavimento: item.pavimento,
                    setor: item.setor,
                    sala: item.sala,
                    disciplina: item.disciplina,
                    divergencia: item.divergencia,
                    fotoUrl: finalFotoUrl,
                    fotoReferenciaUrl: finalFotoReferenciaUrl,
                });
                successIds.push(item.id);
                await new Promise((r) => setTimeout(r, 400));
            } catch (e) {
                console.error("Sync failed for item", item.id, e);
            }
        }

        const remaining = offlineQueue.filter((item) => !successIds.includes(item.id));
        setOfflineQueue(remaining);
        localStorage.setItem("field_report_queue", JSON.stringify(remaining));

        if (remaining.length === 0) {
            toast.success("Sincronização completa!");
            refetchExisting();
        } else {
            toast.warning(
                `${successIds.length} sincronizados, ${remaining.length} falharam e continuam na fila.`
            );
        }
    };

    const handlePhotoChange = (
        type: "RA" | "Real",
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === "RA") {
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

    const handlePhotoDrop = (type: "RA" | "Real", e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === "RA") {
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

    const uploadImage = async (
        file: File,
        type: "real" | "referencias" = "real"
    ): Promise<string | null> => {
        try {
            const fileExt = file.name.split(".").pop() || "jpg";
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `apontamentos/${type}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("project-assets")
                .upload(filePath, file, { contentType: "image/jpeg" });

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("project-assets").getPublicUrl(filePath);

            return publicUrl;
        } catch (e: any) {
            console.error("Upload error:", e);
            toast.error(`Erro ao enviar foto: ${e.message}`);
            return null;
        }
    };

    const handleAddToList = () => {
        if (!selectedSala || !disciplina || !divergencia) {
            toast.error("Preencha a disciplina e a divergência.");
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

        setApontamentosList((prev) => [...prev, newItem]);
        toast.success("Apontamento adicionado à lista!");

        setDisciplina("");
        setDivergencia("");
        setFotoRA(null);
        setFotoRAPreview(null);
        setFotoReal(null);
        setFotoRealPreview(null);
    };

    const handleSaveAll = async () => {
        if (apontamentosList.length === 0) return;

        setIsSavingAll(true);
        let successCount = 0;
        const dataISO = new Date(dataVerificacao + "T12:00:00").toISOString();

        for (const item of apontamentosList) {
            let finalFotoUrl: string | undefined = undefined;
            let finalFotoReferenciaUrl: string | undefined = undefined;

            if (isOnline && item.fotoRA) {
                const url = await uploadImage(item.fotoRA, "referencias");
                if (url) finalFotoReferenciaUrl = url;
            }
            if (isOnline && item.fotoReal) {
                const url = await uploadImage(item.fotoReal, "real");
                if (url) finalFotoUrl = url;
            }

            const payload = {
                projectId,
                data: dataISO,
                edificacao: selectedSala.edificacao,
                pavimento: selectedSala.pavimento,
                setor: selectedSala.setor,
                sala: selectedSala.nome,
                disciplina: item.disciplina,
                divergencia: item.divergencia,
                fotoUrl: finalFotoUrl,
                fotoReferenciaUrl: finalFotoReferenciaUrl,
                status: "ATIVA",
            };

            if (isOnline) {
                try {
                    await createApontamento.mutateAsync(payload);
                    successCount++;
                    await new Promise((r) => setTimeout(r, 400));
                } catch (e) {
                    const queued: QueuedApontamento = {
                        id: crypto.randomUUID(),
                        salaId: selectedSala.id,
                        ...payload,
                        fotoRABase64: item.fotoRAPreview || undefined,
                        fotoRealBase64: item.fotoRealPreview || undefined,
                    };
                    const savedQueue = localStorage.getItem("field_report_queue");
                    const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
                    const updatedQueue = [...currentQueue, queued];
                    setOfflineQueue(updatedQueue);
                    localStorage.setItem("field_report_queue", JSON.stringify(updatedQueue));
                }
            } else {
                const queued: QueuedApontamento = {
                    id: crypto.randomUUID(),
                    salaId: selectedSala.id,
                    ...payload,
                    fotoRABase64: item.fotoRAPreview || undefined,
                    fotoRealBase64: item.fotoRealPreview || undefined,
                };
                const savedQueue = localStorage.getItem("field_report_queue");
                const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
                const updatedQueue = [...currentQueue, queued];
                setOfflineQueue(updatedQueue);
                localStorage.setItem("field_report_queue", JSON.stringify(updatedQueue));
                successCount++;
            }
        }

        setIsSavingAll(false);

        if (isOnline) {
            toast.success(`${successCount} apontamento(s) salvo(s) com sucesso!`);
            setApontamentosList([]);
            refetchExisting();
        } else {
            toast.info(`${successCount} item(ns) salvos localmente (offline).`);
            setApontamentosList([]);
        }
    };

    if (roleLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#940707]" />
            </div>
        );
    }

    if (!isEditor) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
                    <Lock className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-xs">
                    Esta aba é restrita a <strong>Editores</strong> e{" "}
                    <strong>Administradores</strong> do projeto.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Header com Seleção de Localização */}
            <FieldReportHeader
                edificacoes={edificacoes}
                selectedEdificacao={selectedEdificacao}
                onSelectEdificacao={(ed) => {
                    setSelectedEdificacao(ed);
                    setSelectedPavimento("");
                    setSelectedSala(null);
                }}
                pavimentos={pavimentos}
                selectedPavimento={selectedPavimento}
                onSelectPavimento={(pav) => {
                    setSelectedPavimento(pav);
                    setSelectedSala(null);
                }}
                salas={filteredSalas}
                selectedSala={selectedSala}
                onSelectSala={setSelectedSala}
                dataVerificacao={dataVerificacao}
                onDataVerificacaoChange={setDataVerificacao}
            />

            {/* Offline sync banner */}
            <OfflineSyncBanner
                isOnline={isOnline}
                offlineQueue={offlineQueue}
                onSync={syncQueue}
            />

            {!selectedSala ? (
                <Card className="h-64 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
                    <div className="w-14 h-14 rounded-2xl bg-[#940707]/10 flex items-center justify-center mb-3">
                        <MapPin className="w-7 h-7 text-[#940707]" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-700">
                        Nenhuma Sala Selecionada
                    </CardTitle>
                    <CardDescription className="max-w-xs mx-auto mt-1 text-xs text-slate-400">
                        Selecione a edificação, pavimento e sala acima para iniciar o
                        preenchimento do relatório de campo.
                    </CardDescription>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Formulário de Novo Apontamento (Col 7) */}
                    <div className="lg:col-span-7 space-y-6">
                        <InspectionForm
                            selectedSala={selectedSala}
                            disciplina={disciplina}
                            onDisciplinaChange={setDisciplina}
                            divergencia={divergencia}
                            onDivergenciaChange={setDivergencia}
                            fotoRAPreview={fotoRAPreview}
                            fotoRealPreview={fotoRealPreview}
                            onPhotoChange={handlePhotoChange}
                            onPhotoDrop={handlePhotoDrop}
                            onClearPhoto={(type) => {
                                if (type === "RA") {
                                    setFotoRA(null);
                                    setFotoRAPreview(null);
                                } else {
                                    setFotoReal(null);
                                    setFotoRealPreview(null);
                                }
                            }}
                            onAddToList={handleAddToList}
                            onCancelSala={() => setSelectedSala(null)}
                        />

                        {/* Itens adicionados aguardando salvar */}
                        <PendingBatchList
                            items={apontamentosList}
                            onRemoveItem={(id) =>
                                setApontamentosList((prev) => prev.filter((i) => i.id !== id))
                            }
                            onClearAll={() => setApontamentosList([])}
                            onSaveAll={handleSaveAll}
                            isSaving={isSavingAll}
                        />
                    </div>

                    {/* Histórico de Apontamentos da Sala (Col 5) */}
                    <div className="lg:col-span-5 space-y-6">
                        <ExistingRoomIssuesList
                            issues={existingApontamentos}
                            onDeleteIssue={(id) => {
                                if (
                                    confirm(
                                        "Deseja realmente excluir este apontamento da sala?"
                                    )
                                ) {
                                    deleteApontamentoMutation.mutate({ id });
                                }
                            }}
                            isDeleting={deleteApontamentoMutation.isPending}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
