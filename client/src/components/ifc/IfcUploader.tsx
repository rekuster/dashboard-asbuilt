import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileBox, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function IfcUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [edificacao, setEdificacao] = useState<string>("");

    const utils = trpc.useUtils();
    const { data: ifcFiles = [] } = trpc.ifc.getAllFiles.useQuery();

    const uploadMutation = trpc.ifc.uploadFile.useMutation({
        onSuccess: () => {
            toast.success("Arquivo IFC carregado e mapeado com sucesso!");
            utils.ifc.getAllFiles.invalidate();
            setFile(null);
        },
        onError: (error) => {
            toast.error(`Erro no upload: ${error.message}`);
        },
        onSettled: () => setIsUploading(false)
    });

    const deleteIfcMutation = trpc.ifc.deleteFile.useMutation({
        onSuccess: () => {
            toast.success("Arquivo IFC removido.");
            utils.ifc.getAllFiles.invalidate();
        },
        onError: (err: any) => {
            toast.error(`Erro ao remover: ${err.message}`);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await uploadMutation.mutateAsync({
                fileBuffer: base64,
                fileName: file.name,
                edificacao: edificacao || null,
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileBox className="w-5 h-5 text-blue-600" />
                        Upload de Modelo IFC 3D
                    </CardTitle>
                    <CardDescription>Envie arquivos .ifc para visualizar o status das salas em 3D.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Edificação Associada</label>
                        <input
                            type="text"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Ex: BLOCO A, SEDE..."
                            value={edificacao}
                            onChange={(e) => setEdificacao(e.target.value)}
                        />
                    </div>

                    <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-slate-50/50"
                        onClick={() => document.getElementById('ifc-upload')?.click()}
                    >
                        <input
                            id="ifc-upload"
                            type="file"
                            accept=".ifc"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {file ? (
                            <div className="flex flex-col items-center">
                                <CheckCircle2 className="w-8 h-8 text-blue-500 mb-2" />
                                <span className="text-xs font-medium text-slate-700">{file.name}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-xs text-slate-500">Clique para selecionar o arquivo .ifc</span>
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isUploading ? <Loader2 className="mr-2 h-4 h-4 animate-spin" /> : "Fazer Upload IFC"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Gerenciar Modelos Carregados
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {ifcFiles.length > 0 ? (
                            ifcFiles.map((file: any) => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileBox className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-medium text-slate-700">{file.fileName}</span>
                                            <span className="text-[10px] text-slate-400 italic">{file.edificacao || 'Geral'}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive opacity-40 group-hover:opacity-100 transition-opacity"
                                        onClick={() => {
                                            if (confirm(`Excluir permanentemente o modelo ${file.fileName}?`)) {
                                                deleteIfcMutation.mutate({ fileId: file.id });
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-xs text-slate-400 italic">
                                Nenhum modelo encontrado.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
