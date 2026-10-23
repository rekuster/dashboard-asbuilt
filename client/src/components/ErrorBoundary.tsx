import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                    <p className="font-bold text-amber-950">
                        {this.props.fallbackTitle || "Não foi possível exibir esta seção no momento."}
                    </p>
                    <p className="mt-1 text-amber-800/80 font-mono text-[11px]">
                        {this.state.error?.message || "Erro inesperado de renderização."}
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}
