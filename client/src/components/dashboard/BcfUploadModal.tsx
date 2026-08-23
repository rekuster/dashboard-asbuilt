import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Upload, Loader2, FileCode, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import JSZip from "jszip";

interface BcfUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    initialDiscipline?: string;
    initialEdificacao?: string;
    disciplinesList: Array<{ sigla: string; nome: string }>;
    edificacoesList: string[];
}

export function BcfUploadModal({
    isOpen,
    onClose,
    projectId,
    initialDiscipline,
    initialEdificacao,
    disciplinesList,
    edificacoesList,
}: BcfUploadModalProps) {
    const [selectedDiscipline, setSelectedDiscipline] = useState(
        initialDiscipline || disciplinesList[0]?.sigla || ""
    );
    const [selectedEdificacao, setSelectedEdificacao] = useState(
        initialEdificacao || edificacoesList[0] || "Prédio Produção"
    );
    const [isPartnerReturn, setIsPartnerReturn] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progressMsg, setProgressMsg] = useState("");

    const utils = trpc.useUtils();

    const uploadBcfMutation = trpc.issues.uploadBcfFile.useMutation();
    const syncBcfMutation = trpc.issues.syncBcfData.useMutation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (!selected.name.endsWith(".bcf") && !selected.name.endsWith(".bcfzip")) {
                toast.error("Por favor, selecione um arquivo válido .bcf ou .bcfzip gerado pelo Navisworks.");
                return;
            }
            setFile(selected);

            // Auto-detect se o nome do arquivo sugere retorno de parceiro
            const lowerName = selected.name.toLowerCase();
            if (lowerName.includes("celso") || lowerName.includes("retorno") || lowerName.includes("corrigido") || lowerName.includes("ocle") || lowerName.includes("tha")) {
                setIsPartnerReturn(true);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Selecione um arquivo .bcf para upload.");
            return;
        }
        if (!selectedDiscipline || !selectedEdificacao) {
            toast.error("Selecione a disciplina e a edificação.");
            return;
        }

        setUploading(true);
        setProgressMsg("Lendo arquivo BCF e descompactando tópicos...");

        try {
            // 1. Descompactar e extrair tópicos do BCF
            const zip = await JSZip.loadAsync(file);
            const files = Object.keys(zip.files);

            // Identifica pastas de tópicos
            const topicFolders = new Set<string>();
            files.forEach((f) => {
                const parts = f.split("/");
                if (parts.length > 1 && parts[0] !== "__MACOSX") {
                    topicFolders.add(parts[0]);
                }
            });

            const topicsParsed: any[] = [];
            const folderList = Array.from(topicFolders);

            setProgressMsg(`Processando ${folderList.length} tópicos e enviando snapshots...`);

            for (let i = 0; i < folderList.length; i++) {
                const folder = folderList[i];
                const markupFile = zip.file(`${folder}/markup.bcf`);
                const snapshotFile = zip.file(`${folder}/snapshot.png`) || zip.file(`${folder}/snapshot.jpg`);

                let markupXml = "";
                if (markupFile) {
                    markupXml = await markupFile.async("text");
                }

                const getTag = (xml: string, tag: string) => {
                    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
                    return m ? m[1].trim() : null;
                };
                const getAttr = (xml: string, tag: string, attr: string) => {
                    const m = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["']`, "i"));
                    return m ? m[1].trim() : null;
                };

                const title = getTag(markupXml, "Title") || `Issue #${i + 1}`;
                const description = getTag(markupXml, "Description") || "";
                const index = getTag(markupXml, "Index") || getAttr(markupXml, "Topic", "Index") || i + 1;
                const topicStatus = getTag(markupXml, "TopicStatus") || getAttr(markupXml, "Topic", "TopicStatus") || "Active";
                const author = getTag(markupXml, "CreationAuthor") || "Stecla";
                const creationDate = getTag(markupXml, "CreationDate") || new Date().toISOString();

                // Parse de comentários
                const comments: any[] = [];
                const commentMatches = markupXml.matchAll(/<Comment[\s\S]*?<\/Comment>/gi);
                for (const cm of commentMatches) {
                    const cXml = cm[0];
                    const cText = getTag(cXml, "Comment") || "";
                    if (cText && !cText.includes("<Date>")) {
                        comments.push({
                            author: getTag(cXml, "Author") || getTag(cXml, "CommentAuthor") || author,
                            date: getTag(cXml, "Date") || getTag(cXml, "CommentDate") || "",
                            text: cText,
                            status: getTag(cXml, "Status") || "",
                        });
                    }
                }

                // Upload do snapshot se presente
                let snapshotUrl: string | undefined = undefined;
                if (snapshotFile) {
                    const snapshotData = await snapshotFile.async("blob");
                    const snapshotFileName = `bcf-snapshots/${projectId}/${selectedDiscipline}_${selectedEdificacao}_issue_${index}_${Date.now()}.png`;

                    const { error: snapError } = await supabase.storage
                        .from("project-assets")
                        .upload(snapshotFileName, snapshotData, {
                            contentType: "image/png",
                            upsert: true,
                        });

                    if (!snapError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from("project-assets")
                            .getPublicUrl(snapshotFileName);
                        snapshotUrl = publicUrl;
                    }
                }

                topicsParsed.push({
                    index,
                    title,
                    description,
                    topicStatus,
                    author,
                    creationDate,
                    snapshotUrl,
                    comments,
                });
            }

            setProgressMsg("Salvando arquivo BCF oficial no armazenamento...");

            // 2. Upload do arquivo .BCF completo
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const storagePath = `bcf/${projectId}/${selectedDiscipline}_${selectedEdificacao}_${Date.now()}_${cleanFileName}`;

            const { error: uploadError } = await supabase.storage
                .from("project-assets")
                .upload(storagePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from("project-assets").getPublicUrl(storagePath);

            // 3. Registrar metadados do arquivo BCF
            await uploadBcfMutation.mutateAsync({
                projectId,
                disciplina: selectedDiscipline.toUpperCase(),
                edificacao: selectedEdificacao,
                fileName: file.name,
                fileUrl: publicUrl,
                fileSize: file.size,
                uploadedBy: isPartnerReturn ? "Parceiro" : "Stecla",
            });

            setProgressMsg("Sincronizando apontamentos no banco de dados...");

            // 4. Sincronizar tópicos e snapshots com a tabela de apontamentos
            const syncResult = await syncBcfMutation.mutateAsync({
                projectId,
                disciplina: selectedDiscipline.toUpperCase(),
                edificacao: selectedEdificacao,
                isPartnerReturn,
                topics: topicsParsed,
            });

            toast.success(
                `Arquivo BCF sincronizado! ${syncResult.updatedCount} de ${syncResult.totalTopics} apontamentos atualizados com snapshots e notas.`
            );

            utils.issues.getBcfFiles.invalidate();
            utils.dashboard.getApontamentos.invalidate({ projectId });
            utils.dashboard.getSalas.invalidate({ projectId });
            utils.dashboard.getKPIs.invalidate({ projectId });

            onClose();
            setFile(null);
            setUploading(false);
            setProgressMsg("");
        } catch (error: any) {
            toast.error("Falha no processamento do BCF: " + error.message);
            setUploading(false);
            setProgressMsg("");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-[#9C1915] rounded-xs" />
                        <DialogTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
                            Carregar BCF Navisworks
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-slate-500">
                        Faça o upload do arquivo <strong>.bcf</strong> gerado no Navisworks. O sistema extrai automaticamente as fotos e notas técnicas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-3">
                    {/* Seletor Manual de Disciplina e Edificação */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Disciplina *
                            </label>
                            <select
                                value={selectedDiscipline}
                                onChange={(e) => setSelectedDiscipline(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#9C1915]"
                            >
                                {disciplinesList.map((d) => (
                                    <option key={d.sigla} value={d.sigla}>
                                        {d.sigla} • {d.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                                Edificação *
                            </label>
                            <select
                                value={selectedEdificacao}
                                onChange={(e) => setSelectedEdificacao(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#9C1915]"
                            >
                                {edificacoesList.map((ed) => (
                                    <option key={ed} value={ed}>
                                        {ed}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tipo de BCF (Oficial Stecla vs Retorno do Projetista) */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-slate-800 block">
                                Devolução / Retorno do Projetista?
                            </span>
                            <span className="text-[10px] text-slate-500">
                                Ative se este arquivo foi corrigido e devolvido pelo parceiro
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={isPartnerReturn}
                            onChange={(e) => setIsPartnerReturn(e.target.checked)}
                            className="w-4 h-4 text-[#9C1915] rounded border-slate-300 focus:ring-[#9C1915] cursor-pointer"
                        />
                    </div>

                    {/* Área de Seleção do Arquivo */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-600">
                            Arquivo .BCF do Navisworks *
                        </label>

                        <div className="border-2 border-dashed border-slate-200 hover:border-[#9C1915]/50 bg-slate-50/60 rounded-xl p-5 text-center transition-colors">
                            <input
                                type="file"
                                accept=".bcf,.bcfzip"
                                onChange={handleFileChange}
                                className="hidden"
                                id="bcf-file-input"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="bcf-file-input"
                                className="cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-50 text-[#9C1915] flex items-center justify-center">
                                    <FileCode className="w-5 h-5" />
                                </div>
                                {file ? (
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-slate-800">{file.name}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-slate-700">
                                            Clique para selecionar o arquivo .bcf
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Exportado pelo BCF Manager no Navisworks
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Mensagem de Progresso durante upload */}
                    {uploading && (
                        <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl flex items-center gap-2.5 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin text-[#9C1915] shrink-0" />
                            <span className="text-xs font-semibold text-[#9C1915]">
                                {progressMsg}
                            </span>
                        </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={uploading}
                            className="h-8 px-3 text-xs font-bold"
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={uploading || !file}
                            size="sm"
                            className="h-8 px-4 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-xs"
                        >
                            {uploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Upload className="w-3.5 h-3.5" />
                            )}
                            Carregar e Sincronizar BCF
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
