import { useEffect, useRef } from "react";
import { useIfcViewer } from "@/hooks/useIfcViewer";
import { Loader2, Box, Maximize, Info, Layers, Edit3, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import ColorLegend from "./ColorLegend";

interface IfcViewerProps {
    modelUrl?: string;
}

export default function IfcViewer({ modelUrl }: IfcViewerProps) {
    const {
        containerRef,
        init,
        loadIfcModel,
        isLoaded,
        selectedRoom,
        setSelectedRoom,
        xRay,
        setXRay,
        mappingMode,
        setMappingMode
    } = useIfcViewer();
    const [searchTerm, setSearchTerm] = useState("");

    const utils = trpc.useUtils();
    const { data: allSalas } = trpc.dashboard.getSalas.useQuery();
    const linkMutation = trpc.ifc.linkIfcToRoom.useMutation({
        onSuccess: () => {
            toast.success("Sala vinculada com sucesso!");
            utils.ifc.getRoomsWithColors.invalidate();
            setMappingMode(false);
            setSelectedRoom(null);
        },
        onError: (err: any) => {
            toast.error(`Erro ao vincular: ${err.message}`);
        }
    });

    const unlinkIdMutation = trpc.ifc.unlinkIfcFromRoom.useMutation({
        onSuccess: () => {
            toast.success("ID desvinculado com sucesso!");
            utils.ifc.getRoomsWithColors.invalidate();
            setSelectedRoom(null);
        },
        onError: (err: any) => {
            toast.error(`Erro ao desvincular: ${err.message}`);
        }
    });

    const filteredRooms = useMemo(() => {
        if (!allSalas) return [];
        return (allSalas as any[]).filter((s: any) =>
            s.nome.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10);
    }, [allSalas, searchTerm]);

    const [showReset, setShowReset] = useState(false);

    useEffect(() => {
        let timer: any;
        if (!isLoaded) {
            timer = setTimeout(() => setShowReset(true), 5000);
        } else {
            setShowReset(false);
        }
        return () => clearTimeout(timer);
    }, [isLoaded]);

    const handleReset = () => {
        window.location.reload();
    };

    useEffect(() => {
        if (containerRef.current) {
            const cleanup = init(containerRef.current);
            return cleanup;
        }
    }, [init, containerRef]);

    useEffect(() => {
        if (isLoaded && modelUrl) {
            loadIfcModel(modelUrl);
        }
    }, [isLoaded, modelUrl, loadIfcModel]);

    return (
        <div className="relative w-full h-full min-h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl group">
            {/* 3D Canvas Container */}
            <div ref={containerRef} className="w-full h-full cursor-move" />

            {/* Loading Overlay */}
            {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="text-slate-300 font-medium mb-4">Inicializando WebGL...</p>
                    {showReset && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                        >
                            Reiniciar Visualizador
                        </Button>
                    )}
                </div>
            )}

            {/* Controls Overlay (Top) */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
                <div className="bg-slate-800/90 backdrop-blur-md p-1 rounded-lg border border-slate-700 shadow-lg flex gap-1">
                    <Button
                        variant={xRay ? "default" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 ${!xRay ? 'text-slate-300 hover:text-white hover:bg-slate-700' : ''}`}
                        onClick={() => setXRay(!xRay)}
                        title="Modo Raio-X (Ver espaços internos)"
                    >
                        <Layers className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={mappingMode ? "default" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 ${mappingMode ? 'bg-amber-600 hover:bg-amber-700' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                        onClick={() => {
                            setMappingMode(!mappingMode);
                            setSelectedRoom(null);
                        }}
                        title="Modo Mapeamento (Vincular salas do Excel)"
                    >
                        <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700">
                        <Box className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700">
                        <Maximize className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Color Legend (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-10">
                <ColorLegend />
            </div>

            {/* Selected Room Info (Bottom Right) */}
            {selectedRoom && !mappingMode && (
                <div className="absolute bottom-4 right-4 max-w-xs z-10 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-800/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                            <Info className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-white text-sm">{selectedRoom.nome}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-slate-500">
                            <div>Status</div>
                            <div className="text-right">Apontamentos</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: selectedRoom.color }}
                                ></div>
                                <span className="text-slate-200">{selectedRoom.status}</span>
                            </div>
                            <div className="text-right text-slate-200">{selectedRoom.numApontamentos}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mapping Panel (Top Right) */}
            {mappingMode && (
                <div className="absolute top-4 right-4 w-80 z-20 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-800/95 backdrop-blur-md p-4 rounded-xl border border-amber-600/50 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <div className="flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-amber-500" />
                                <h3 className="font-bold text-white text-sm">Vincular Ambiente</h3>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMappingMode(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>


                        {!selectedRoom ? (
                            <div className="text-center py-6 text-slate-400">
                                <Box className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">Clique em um "volume" no modelo 3D para selecionar</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">IDs Vinculados nesta Sala</p>
                                        <p className="text-[12px] text-white font-mono break-all leading-tight">
                                            {allSalas?.find((s: any) => s.id === selectedRoom.id)?.ifcExpressId || selectedRoom.ifcExpressId || 'ID Capturado'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px] text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 justify-end px-0"
                                            onClick={() => {
                                                const sala = allSalas?.find((s: any) =>
                                                    String(s.ifcExpressId || '').split(',').map(ss => ss.trim()).includes(String(selectedRoom.ifcExpressId))
                                                );

                                                if (sala) {
                                                    unlinkIdMutation.mutate({
                                                        salaId: sala.id,
                                                        ifcExpressId: selectedRoom.ifcExpressId
                                                    });
                                                }
                                            }}
                                        >
                                            Desvincular ID
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700/50 justify-end px-0"
                                            onClick={() => {
                                                const sala = allSalas?.find((s: any) =>
                                                    String(s.ifcExpressId || '').split(',').map(ss => ss.trim()).includes(String(selectedRoom.ifcExpressId))
                                                ) || selectedRoom;

                                                if (sala && sala.id) {
                                                    linkMutation.mutate({ salaId: sala.id, ifcExpressId: null });
                                                }
                                            }}
                                        >
                                            Limpar Tudo
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Buscar Sala (Excel)</p>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                        <Input
                                            placeholder="Ex: Laminação..."
                                            className="pl-8 h-9 bg-slate-900 border-slate-700 text-xs"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                        {filteredRooms.map(sala => (
                                            <button
                                                key={sala.id}
                                                className={`w-full text-left p-2 rounded text-xs transition-colors ${(linkMutation as any).isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 text-slate-300 hover:text-white'
                                                    }`}
                                                onClick={() => linkMutation.mutate({
                                                    salaId: (sala as any).id,
                                                    ifcExpressId: (selectedRoom as any).ifcExpressId
                                                })}
                                            >
                                                {(sala as any).nome}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Instruction Overlay (Temporary) */}
            {!modelUrl && isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900/40">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <Box className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Sem Modelo IFC Ativo</h2>
                    <p className="text-slate-400 max-w-sm">
                        Faça o upload de um arquivo .ifc na aba "Gestão" para visualizar as salas em 3D.
                    </p>
                </div>
            )}
        </div>
    );
}
