import { Button } from "@/components/ui/button";
import {
    RotateCcw,
    Selection,
    Layers,
    Eye,
    EyeOff,
    ZoomIn,
    Settings2
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function IfcControls() {
    const controls = [
        { icon: RotateCcw, label: "Resetar Câmera", action: () => { } },
        { icon: Selection, label: "Seleção de Sala", action: () => { } },
        { icon: ZoomIn, label: "Focar Tudo", action: () => { } },
        { icon: Layers, label: "Camadas", action: () => { } },
        { icon: Settings2, label: "Configurações", action: () => { } },
    ];

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-2 bg-slate-800/90 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-2xl">
                {controls.map((ctrl, idx) => (
                    <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                onClick={ctrl.action}
                            >
                                <ctrl.icon className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                            <p>{ctrl.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}

                <div className="h-px bg-slate-700 my-1 mx-2" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        >
                            <Eye className="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                        <p>Alternar Visibilidade</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
