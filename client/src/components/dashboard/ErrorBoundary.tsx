import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in Dashboard:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border-2 border-dashed border-rose-200 gap-6 animate-in fade-in duration-500">
                    <div className="p-4 bg-rose-50 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Algo deu errado nesta aba</h2>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm">
                            Ocorreu um erro inesperado ao carregar o visualizador. Isso pode ser causado por problemas de memória ou incompatibilidade do modelo.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-w-md w-full overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Detalhes técnicos:</p>
                        <p className="text-xs font-mono text-rose-600 break-all leading-tight">
                            {this.state.error?.message || "Erro desconhecido"}
                        </p>
                    </div>
                    <Button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="gap-2 rounded-full shadow-lg shadow-primary/20"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Tentar Novamente
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
