import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Building2, CalendarDays, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VerificacaoProgressoChart from "@/components/charts/VerificacaoProgressoChart";

interface ProgressoData {
    name: string;
    timestamp: number | null;
    Realizado: number | null;
    Projetado: number | null;
    Meta?: number | null;
}

interface SimuladorTendenciaCardProps {
    data: ProgressoData[];
    allRooms: any[];
    projectId?: string;
    project?: any;
}

// Helper: Calculate business days between two dates
const getBusinessDaysCount = (start: Date, end: Date) => {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
};

// Helper: Add business days to a date
const addBusinessDays = (start: Date, days: number) => {
    const date = new Date(start);
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) added++;
    }
    return date;
};

export default function SimuladorTendenciaCard({ data, allRooms, projectId, project }: SimuladorTendenciaCardProps) {
    const [roomsPerWeek, setRoomsPerWeek] = useState<number>(9);
    const [targetDate, setTargetDate] = useState<string>("");
    const [mode, setMode] = useState<"speed" | "date">("speed");
    const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [isSavingBaseline, setIsSavingBaseline] = useState(false);
    const [showFixSuccess, setShowFixSuccess] = useState(false);

    const utils = trpc.useUtils();
    const updateBaselineMutation = trpc.projects.updateBaseline.useMutation();

    // Load project-wide baseline if it exists
    useEffect(() => {
        if (project?.baselineRoomsPerWeek) {
            setRoomsPerWeek(project.baselineRoomsPerWeek);
        }
        if (project?.baselineTargetDate) {
            const date = new Date(project.baselineTargetDate);
            setTargetDate(date.toISOString().split('T')[0]);
        }
    }, [project]);

    // Get unique buildings from all rooms
    const buildingsList = useMemo(() => {
        const set = new Set(allRooms.map(r => r.edificacao).filter(Boolean));
        return Array.from(set).sort();
    }, [allRooms]);

    // Calculate dynamic counts based on selection
    const { totalSalas, salasVerificadas } = useMemo(() => {
        const filtered = selectedBuildings.length > 0
            ? allRooms.filter(r => selectedBuildings.includes(r.edificacao))
            : allRooms;
            
        const salasVerificadasCount = filtered.filter(r => r.status?.trim().toUpperCase() === 'VERIFICADA').length;
            
        return {
            totalSalas: filtered.length,
            salasVerificadas: salasVerificadasCount
        };
    }, [allRooms, selectedBuildings]);

    const salasRestantes = Math.max(0, totalSalas - salasVerificadas);

    // Initial calculation for target date based on default speed (9 rooms/week)
    useEffect(() => {
        if (mode === "speed" && roomsPerWeek > 0) {
            // Velocity is per week (usually 5 business days)
            const speedPerBusinessDay = roomsPerWeek / 5;
            const businessDaysNeeded = salasRestantes > 0 ? (salasRestantes / speedPerBusinessDay) : 0;
            const finishDate = addBusinessDays(new Date(), Math.ceil(businessDaysNeeded));
            setTargetDate(finishDate.toISOString().split('T')[0]);
        }
    }, [roomsPerWeek, mode, salasRestantes]);

    const globalTotalSalas = useMemo(() => allRooms.length, [allRooms]);

    const simulatedData = useMemo<ProgressoData[]>(() => {
        if (!data || data.length === 0) return [];

        // 1. Scale historical data based on selection ratio
        const ratio = globalTotalSalas > 0 ? (totalSalas / globalTotalSalas) : 1;

        const history: ProgressoData[] = data
            .filter(d => d.Realizado !== null)
            .map(d => ({
                name: d.name,
                timestamp: d.timestamp,
                Realizado: d.Realizado !== null ? Math.round(d.Realizado * ratio) : null,
                Projetado: null,
                Meta: null
            }));

        if (history.length === 0) return data;

        const result = [...history];

        // 2. Calculate simulation parameters
        let speedPerBusinessDay = 0;
        if (mode === "speed") {
            speedPerBusinessDay = roomsPerWeek / 5;
        } else {
            const tDate = new Date(targetDate + "T12:00:00");
            const now = new Date();
            const businessDaysCount = getBusinessDaysCount(now, tDate);
            speedPerBusinessDay = salasRestantes / businessDaysCount;
        }

        if (speedPerBusinessDay <= 0 && salasRestantes > 0) return history;

        // 3. Generate projection points
        const businessDaysToFinish = speedPerBusinessDay > 0 ? salasRestantes / speedPerBusinessDay : 0;
        
        // Point 0: Interruption (where Projetado starts or ends if finished)
        const lastIndex = result.length - 1;
        result[lastIndex] = { 
            ...result[lastIndex], 
            Projetado: result[lastIndex].Realizado ?? 0 
        };

        if (salasRestantes > 0) {
            // Point 1: Middle
            if (businessDaysToFinish > 2) {
                const midDate = addBusinessDays(new Date(), Math.ceil(businessDaysToFinish / 2));
                const labelMid = `${midDate.getDate().toString().padStart(2, '0')}/${(midDate.getMonth() + 1).toString().padStart(2, '0')}/${midDate.getFullYear().toString().slice(-2)}`;
                
                result.push({
                    name: labelMid,
                    timestamp: midDate.getTime(),
                    Realizado: null,
                    Projetado: Math.round(salasVerificadas + (salasRestantes / 2)),
                    Meta: null
                });
            }

            // Point 2: End
            const endDate = addBusinessDays(new Date(), Math.ceil(businessDaysToFinish));
            const labelEnd = `${endDate.getDate().toString().padStart(2, '0')}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getFullYear().toString().slice(-2)}`;
            
            result.push({
                name: labelEnd,
                timestamp: endDate.getTime(),
                Realizado: null,
                Projetado: totalSalas,
                Meta: null
            });
        } else {
            // If already finished, ensure projection doesn't go beyond total
            if (result[lastIndex]) {
                result[lastIndex].Projetado = totalSalas;
            }
        }

            result.forEach(point => {
                if (point.timestamp) {
                    const businessDaysElapsed = getBusinessDaysCount(new Date(startTimestamp), new Date(point.timestamp)) - 1;
                    if (businessDaysElapsed >= 0) {
                        // Use totalSalas (selected) instead of globalTotalSalas to match the scale of other lines
                        point.Meta = Math.min(totalSalas, Math.round(startVal + (businessDaysElapsed * baselineSpeedPerBusinessDay)));
                    } else {
                        point.Meta = startVal;
                    }
                }
            });

        return result;
    }, [data, mode, roomsPerWeek, targetDate, salasRestantes, salasVerificadas, totalSalas, globalTotalSalas, project]);

    const handleSpeedChange = (val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setRoomsPerWeek(num);
            setMode("speed");
        }
    };

    const handleDateChange = (val: string) => {
        setTargetDate(val);
        setMode("date");
        
        // Calculate rooms per week required for this date (using business days)
        const tDate = new Date(val + "T12:00:00");
        const now = new Date();
        const businessDaysCount = getBusinessDaysCount(now, tDate);
        const neededPerWeek = (salasRestantes / businessDaysCount) * 5;
        setRoomsPerWeek(Math.round(neededPerWeek * 10) / 10);
    };

    const toggleBuilding = (b: string) => {
        setSelectedBuildings((prev: string[]) => 
            prev.includes(b) ? prev.filter((item: string) => item !== b) : [...prev, b]
        );
    };

    const handleFixBaseline = async () => {
        if (!projectId) return;
        setIsSavingBaseline(true);
        try {
            await updateBaselineMutation.mutateAsync({
                id: projectId,
                baselineTargetDate: targetDate,
                baselineRoomsPerWeek: roomsPerWeek
            });
            utils.projects.getById.invalidate({ id: projectId });
        } catch (error) {
            console.error("Error saving baseline:", error);
        } finally {
            setIsSavingBaseline(false);
        }
        
        setShowFixSuccess(true);
        setTimeout(() => setShowFixSuccess(false), 3000);
    };

    return (
        <Card className="col-span-1 lg:col-span-2 xl:col-span-3 min-h-[550px] flex flex-col overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            Simulador de Tendência de Verificação
                        </CardTitle>

                        {/* Multi-Select Dropdown */}
                        <div className="flex items-center gap-2">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">Edificações:</Label>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="h-8 w-[250px] justify-between text-xs font-bold border-slate-200"
                                    >
                                        <div className="truncate flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            {selectedBuildings.length === 0 
                                                ? "Todas as Edificações" 
                                                : `${selectedBuildings.length} selecionadas`}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Buscar edificação..." className="h-8" />
                                        <CommandEmpty>Nenhuma encontrada.</CommandEmpty>
                                        <CommandGroup className="max-h-60 overflow-y-auto">
                                            {buildingsList.map((building) => (
                                                <CommandItem
                                                    key={building}
                                                    onSelect={() => toggleBuilding(building)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <div className={cn(
                                                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        selectedBuildings.includes(building)
                                                            ? "bg-primary text-primary-foreground"
                                                            : "opacity-50 [&_svg]:invisible"
                                                    )}>
                                                        <Check className={cn("h-3 w-3")} />
                                                    </div>
                                                    <span className="truncate">{building}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedBuildings.length > 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedBuildings([])}
                                    className="h-8 px-2 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                >
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Salas p/ Semana
                            </Label>
                            <Input 
                                type="number" 
                                value={roomsPerWeek} 
                                onChange={(e) => handleSpeedChange(e.target.value)}
                                className="h-8 w-24 text-xs font-bold border-slate-200 focus:border-primary focus:ring-primary/20"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                                <Target className="w-3 h-3" /> Data de Término
                            </Label>
                            <Input 
                                type="date" 
                                value={targetDate} 
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="h-8 w-36 text-xs font-bold border-slate-200 focus:border-primary focus:ring-primary/20"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1 invisible">
                                .
                            </Label>
                            <Button
                                onClick={handleFixBaseline}
                                disabled={isSavingBaseline || !projectId}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-[10px] font-bold border-primary/20 text-primary hover:bg-primary/5 gap-2"
                            >
                                <Target className="w-3.5 h-3.5" />
                                {isSavingBaseline ? "Salvando..." : showFixSuccess ? "✓ Meta Salva!" : "Fixar como Plano"}
                            </Button>
                        </div>

                        <div className="hidden md:flex flex-col gap-0.5 justify-center flex-1 text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Status da Simulação</span>
                            <span className="text-xs font-bold text-primary">
                                {mode === "speed" ? "Simulando por Velocidade" : "Simulando por Prazo"}
                            </span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-6">
                <div className="h-[350px]">
                    <VerificacaoProgressoChart data={simulatedData} />
                </div>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Total Escopo</p>
                        <p className="text-xl font-black text-slate-800">{totalSalas} <span className="text-xs font-medium text-slate-500">salas</span></p>
                   </div>
                   <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200/50">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Restam</p>
                        <p className="text-xl font-black text-emerald-800">{salasRestantes} <span className="text-xs font-medium text-emerald-500">salas</span></p>
                   </div>
                   <div className="bg-rose-50 p-3 rounded-lg border border-rose-200/50">
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Velocidade Meta</p>
                        <p className="text-xl font-black text-rose-800">{(roomsPerWeek / 5).toFixed(2)} <span className="text-xs font-medium text-rose-500">salas/dia úteis</span></p>
                   </div>
                   <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                        <p className="text-[10px] font-bold text-primary uppercase">Conclusão Estimada</p>
                        <p className="text-xl font-black text-primary">
                            {new Date(targetDate + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                   </div>
                </div>
            </CardContent>
        </Card>
    );
}
