import { trpc } from "@/lib/trpc";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DataIntegrityAlert() {
    const { data: validacao } = trpc.dashboard.getValidacaoIntegridade.useQuery();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!validacao || !validacao.temProblemas) return null;

    return (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold flex items-center justify-between">
                Problemas de Integridade Detectados
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-destructive hover:bg-destructive/20"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? "Ocultar" : "Ver Detalhes"}
                </Button>
            </AlertTitle>
            <AlertDescription className="mt-2">
                <p className="text-sm">
                    Existem <strong>{validacao.totalApontamentosNaoMapeados}</strong> apontamentos atribuídos a
                    <strong> {validacao.totalSalasNaoMapeadas}</strong> salas que não constam no mapeamento oficial.
                </p>

                {isExpanded && (
                    <div className="mt-4 bg-background/50 rounded p-4 max-h-[300px] overflow-auto">
                        <h4 className="text-xs font-bold uppercase mb-2">Salas não encontradas no mapeamento:</h4>
                        <ul className="space-y-1">
                            {validacao.apontamentosNaoMapeados.map((item, idx) => (
                                <li key={idx} className="text-xs flex justify-between border-b border-destructive/10 pb-1">
                                    <span>{item.sala} ({item.edificacao})</span>
                                    <span className="font-mono font-bold">{item.totalApontamentos} apontamentos</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}
