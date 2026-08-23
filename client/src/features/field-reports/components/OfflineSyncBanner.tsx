import React from "react";
import { Button } from "@/components/ui/button";
import { CloudOff, RefreshCcw, Wifi } from "lucide-react";
import { QueuedApontamento } from "../types";

interface OfflineSyncBannerProps {
    isOnline: boolean;
    offlineQueue: QueuedApontamento[];
    onSync: () => void;
}

export function OfflineSyncBanner({
    isOnline,
    offlineQueue,
    onSync,
}: OfflineSyncBannerProps) {
    if (isOnline && offlineQueue.length === 0) return null;

    return (
        <div
            className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border shadow-sm ${
                !isOnline
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
        >
            <div className="flex items-center gap-3">
                {!isOnline ? (
                    <div className="p-2 bg-amber-200/60 rounded-xl text-amber-800">
                        <CloudOff className="w-5 h-5" />
                    </div>
                ) : (
                    <div className="p-2 bg-blue-200/60 rounded-xl text-blue-800">
                        <Wifi className="w-5 h-5" />
                    </div>
                )}
                <div>
                    <h4 className="text-xs font-black uppercase tracking-tight">
                        {!isOnline ? "Modo Offline Ativo" : "Conexão Restabelecida"}
                    </h4>
                    <p className="text-xs opacity-80">
                        {offlineQueue.length > 0
                            ? `${offlineQueue.length} apontamento(s) salvos localmente aguardando sincronização.`
                            : "As alterações serão sincronizadas quando houver conexão."}
                    </p>
                </div>
            </div>

            {isOnline && offlineQueue.length > 0 && (
                <Button
                    size="sm"
                    onClick={onSync}
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2 px-5 shadow-sm"
                >
                    <RefreshCcw className="w-3.5 h-3.5" /> Sincronizar Agora
                </Button>
            )}
        </div>
    );
}
