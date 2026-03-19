import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, TrendingUp, Target } from "lucide-react";
import VerificacaoProgressoChart from "@/components/charts/VerificacaoProgressoChart";

interface ProgressoData {
    name: string;
    timestamp: number | null;
    Realizado: number | null;
    Projetado: number | null;
}

interface SimuladorTendenciaCardProps {
    data: ProgressoData[];
    totalSalas: number;
    salasVerificadas: number;
}

export default function SimuladorTendenciaCard({ data, totalSalas, salasVerificadas }: SimuladorTendenciaCardProps) {
    const [roomsPerWeek, setRoomsPerWeek] = useState<number>(9);
    const [targetDate, setTargetDate] = useState<string>("");
    const [mode, setMode] = useState<"speed" | "date">("speed");

    const salasRestantes = Math.max(0, totalSalas - salasVerificadas);

    // Initial calculation for target date based on default speed (9 rooms/week)
    useEffect(() => {
        if (mode === "speed" && roomsPerWeek > 0) {
            const daysRemaining = (salasRestantes / (roomsPerWeek / 7));
            const date = new Date();
            date.setDate(date.getDate() + daysRemaining);
            setTargetDate(date.toISOString().split('T')[0]);
        }
    }, [roomsPerWeek, mode, salasRestantes]);

    const simulatedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // 1. Keep only historical data (Realizado is not null)
        const history = data.filter(d => d.Realizado !== null);
        if (history.length === 0) return data;

        const lastPoint = history[history.length - 1];
        const result = [...history];

        // 2. Calculate simulation parameters
        let speedPerDay = 0;
        if (mode === "speed") {
            speedPerDay = roomsPerWeek / 7;
        } else {
            const tDate = new Date(targetDate + "T12:00:00");
            const now = new Date();
            const diffDays = Math.max(1, (tDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            speedPerDay = salasRestantes / diffDays;
        }

        if (speedPerDay <= 0) return data;

        // 3. Generate projection points
        const daysToFinish = salasRestantes / speedPerDay;
        
        // Point 0: Interruption (where Projetado starts)
        const lastIndex = result.length - 1;
        result[lastIndex] = { ...result[lastIndex], Projetado: result[lastIndex].Realizado };

        // Point 1: Middle
        if (daysToFinish > 2) {
            const midDate = new Date();
            midDate.setDate(midDate.getDate() + (daysToFinish / 2));
            const labelMid = `${midDate.getDate().toString().padStart(2, '0')}/${(midDate.getMonth() + 1).toString().padStart(2, '0')}/${midDate.getFullYear().toString().slice(-2)}`;
            
            result.push({
                name: labelMid,
                timestamp: midDate.getTime(),
                Realizado: null,
                Projetado: Math.round(salasVerificadas + (salasRestantes / 2))
            });
        }

        // Point 2: End
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysToFinish);
        const labelEnd = `${endDate.getDate().toString().padStart(2, '0')}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getFullYear().toString().slice(-2)}`;
        
        result.push({
            name: labelEnd,
            timestamp: endDate.getTime(),
            Realizado: null,
            Projetado: totalSalas
        });

        return result;
    }, [data, mode, roomsPerWeek, targetDate, salasRestantes, salasVerificadas, totalSalas]);

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
        
        // Calculate rooms per week required for this date
        const tDate = new Date(val + "T12:00:00");
        const now = new Date();
        const diffDays = Math.max(1, (tDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const neededPerWeek = (salasRestantes / diffDays) * 7;
        setRoomsPerWeek(Math.round(neededPerWeek * 10) / 10);
    };

    return (
        <Card className="col-span-1 lg:col-span-2 xl:col-span-3 min-h-[500px] flex flex-col overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        Simulador de Tendência de Verificação
                    </CardTitle>
                    
                    <div className="flex flex-wrap items-center gap-6">
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

                        <div className="hidden md:flex flex-col gap-0.5 justify-center">
                            <span className="text-[10px] text-slate-400 font-medium">Status</span>
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
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
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Restam</p>
                        <p className="text-xl font-black text-slate-800">{salasRestantes} <span className="text-xs font-medium text-slate-500">salas</span></p>
                   </div>
                   <div className="bg-rose-50 p-3 rounded-lg border border-rose-200/50">
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Velocidade Meta</p>
                        <p className="text-xl font-black text-rose-800">{(roomsPerWeek / 7).toFixed(2)} <span className="text-xs font-medium text-rose-500">salas/dia</span></p>
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
