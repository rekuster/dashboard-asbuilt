import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ExcelUploadSection() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const utils = trpc.useUtils();
    const uploadMutation = trpc.dashboard.uploadExcel.useMutation({
        onSuccess: (data) => {
            toast.success(`Upload concluído! ${data.totalSalas} salas e ${data.totalApontamentos} apontamentos processados.`);
            utils.dashboard.invalidate();
            setFile(null);
        },
        onError: (error) => {
            toast.error(`Erro no upload: ${error.message}`);
        },
        onSettled: () => {
            setIsUploading(false);
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
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                await uploadMutation.mutateAsync({
                    fileBuffer: base64,
                    fileName: file.name,
                });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Upload error:", error);
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    Atualizar Dados (Excel)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('excel-upload')?.click()}
                >
                    <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {file ? (
                        <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Clique ou arraste o arquivo Excel aqui</span>
                            <span className="text-xs text-muted-foreground mt-1">Formatos suportados: .xlsx, .xls</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded flex-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>Aviso: O upload de novos dados substituirá os dados atuais.</span>
                    </div>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-[140px]"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            "Processar Excel"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
