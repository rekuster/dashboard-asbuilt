import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Download,
    Upload,
    Search,
    Building2,
    Filter,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface RoomData {
    sala: string;
    numeroSala?: string;
    edificacao: string;
    pavimento?: string;
    setor?: string;
    total: number;
    ativas: number;
    emRevisao: number;
    sanadas: number;
    status: "CONFORME" | "EM_REVISAO" | "ATIVA" | "PENDENTE";
    apontamentos: any[];
}

interface DesignerRoomsTableProps {
    disciplineSigla: string;
    disciplineDisplayName: string;
    responsavel: string;
    rooms: RoomData[];
    bcfFileUrl?: string | null;
    onBack: () => void;
    onSelectRoom: (room: RoomData) => void;
    onUploadBcf?: () => void;
}

export function DesignerRoomsTable({
    disciplineSigla,
    disciplineDisplayName,
    responsavel,
    rooms,
    bcfFileUrl,
    onBack,
    onSelectRoom,
    onUploadBcf,
}: DesignerRoomsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEdificacao, setSelectedEdificacao] = useState<string>("todas");
    const [selectedStatus, setSelectedStatus] = useState<string>("todos");

    const handleDownloadBcf = () => {
        if (bcfFileUrl) {
            window.open(bcfFileUrl, "_blank");
            toast.success(`Baixando BCF oficial de ${disciplineSigla}...`);
        } else {
            toast.warning(
                `Arquivo .bcf de ${disciplineSigla} (${disciplineDisplayName}) ainda não foi carregado pela Stecla para esta edificação.`
            );
        }
    };

    const handleUploadBcf = () => {
        if (onUploadBcf) {
            onUploadBcf();
        } else {
            toast.info("Selecione o arquivo .bcf ou .bcfzip atualizado no modelo para sincronizar.");
        }
    };

    // Edificações únicas
    const edificacoesList = useMemo(() => {
        const set = new Set(rooms.map((r) => r.edificacao).filter(Boolean));
        return Array.from(set).sort();
    }, [rooms]);

    // Filtragem e ordenação lógica
    const filteredRooms = useMemo(() => {
        return rooms
            .filter((room) => {
                const matchesSearch =
                    !searchTerm ||
                    room.sala.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    room.edificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (room.pavimento || "").toLowerCase().includes(searchTerm.toLowerCase());

                const matchesEdif =
                    selectedEdificacao === "todas" || room.edificacao === selectedEdificacao;

                const matchesStatus =
                    selectedStatus === "todos" ||
                    (selectedStatus === "EM_REVISAO" && room.emRevisao > 0) ||
                    (selectedStatus === "CONFORME" && room.emRevisao === 0 && room.sanadas > 0);

                return matchesSearch && matchesEdif && matchesStatus;
            })
            .sort((a, b) => {
                const numA = parseInt(a.numeroSala || "0", 10);
                const numB = parseInt(b.numeroSala || "0", 10);
                if (!isNaN(numA) && !isNaN(numB) && numA !== 0 && numB !== 0) {
                    return numA - numB;
                }
                return a.sala.localeCompare(b.sala);
            });
    }, [rooms, searchTerm, selectedEdificacao, selectedStatus]);

    // Contadores
    const totalSalas = filteredRooms.length;
    const totalRevisao = filteredRooms.reduce((acc, r) => acc + r.emRevisao, 0);
    const totalSanadas = filteredRooms.reduce((acc, r) => acc + r.sanadas, 0);

    return (
        <div className="space-y-4">
            {/* Header de Navegação da Disciplina */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onBack}
                        className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-50 gap-1.5"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#9C1915]" />
                        Disciplinas
                    </Button>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-red-50 text-[#9C1915] border border-red-200 px-2 py-0.5 rounded">
                                {disciplineSigla}
                            </span>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                {disciplineDisplayName}
                            </h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                Resp: {responsavel || "Stecla"}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {totalSalas} salas com pendências • {totalRevisao} ajustes a realizar no modelo
                        </p>
                    </div>
                </div>

                {/* Ações BCF da Disciplina */}
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleDownloadBcf}
                        size="sm"
                        className="h-8 px-3 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1.5 shadow-xs"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Baixar BCF Oficial
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleUploadBcf}
                        size="sm"
                        className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                    >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Enviar BCF do Modelo
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filtro Edificação */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Edificação:</span>
                        <select
                            value={selectedEdificacao}
                            onChange={(e) => setSelectedEdificacao(e.target.value)}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-7 text-slate-800 focus:outline-none focus:border-[#9C1915]"
                        >
                            <option value="todas">Todas as Edificações</option>
                            {edificacoesList.map((ed) => (
                                <option key={ed} value={ed}>
                                    {ed}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro Status */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2.5 h-7 text-slate-800 focus:outline-none focus:border-[#9C1915]"
                        >
                            <option value="todos">Todos os Status</option>
                            <option value="EM_REVISAO">🟡 Aguardando Correção (Em Revisão)</option>
                            <option value="CONFORME">🟢 Conforme / Sanada</option>
                        </select>
                    </div>
                </div>

                {/* Busca Textual */}
                <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        placeholder="Buscar sala ou pavimento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-[#9C1915]"
                    />
                </div>
            </div>

            {/* TABELA DE SALAS DA DISCIPLINA NO PADRÃO STECLA */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-[#9C1915] text-white font-bold uppercase tracking-wider text-[10px] h-9">
                            <th className="py-2 px-3.5">Sala / Ambiente</th>
                            <th className="py-2 px-3.5">Edificação / Pavimento</th>
                            <th className="py-2 px-2.5 text-center w-36">Ajustar As Built</th>
                            <th className="py-2 px-2.5 text-center w-28">Sanadas / OK</th>
                            <th className="py-2 px-3.5 text-center w-36">Status do Ambiente</th>
                            <th className="py-2 px-3.5 text-right w-24">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRooms.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-slate-400 text-xs italic">
                                    Nenhuma sala com pendência de ajuste para os filtros selecionados.
                                </td>
                            </tr>
                        ) : (
                            filteredRooms.map((room, idx) => {
                                const isConforme = room.emRevisao === 0 && room.sanadas > 0;

                                return (
                                    <tr
                                        key={idx}
                                        onClick={() => onSelectRoom(room)}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        {/* Sala / Ambiente (Sem código) */}
                                        <td className="py-2.5 px-3.5 font-bold text-slate-800 group-hover:text-[#9C1915] transition-colors">
                                            {room.sala}
                                        </td>

                                        {/* Edificação / Pavimento */}
                                        <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                                            <span className="font-semibold text-slate-700">{room.edificacao}</span>
                                            {room.pavimento && (
                                                <span className="text-slate-400 text-[11px] ml-1.5">
                                                    • {room.pavimento}
                                                </span>
                                            )}
                                        </td>

                                        {/* Em Revisão / Ajustar no Revit */}
                                        <td className="py-2.5 px-2.5 text-center">
                                            {room.emRevisao > 0 ? (
                                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                                    {room.emRevisao} {room.emRevisao === 1 ? "ajuste" : "ajustes"}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">-</span>
                                            )}
                                        </td>

                                        {/* Sanadas */}
                                        <td className="py-2.5 px-2.5 text-center">
                                            {room.sanadas > 0 ? (
                                                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                                    {room.sanadas} OK
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">-</span>
                                            )}
                                        </td>

                                        {/* Status da Sala */}
                                        <td className="py-2.5 px-3.5 text-center">
                                            {isConforme ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Conforme
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock className="w-3 h-3" />
                                                    Ajustar Modelo
                                                </span>
                                            )}
                                        </td>

                                        {/* Botão de Ação */}
                                        <td className="py-2.5 px-3.5 text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-7 px-2.5 text-xs font-bold bg-[#9C1915] hover:bg-[#7D1411] text-white gap-1 shadow-2xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectRoom(room);
                                                }}
                                            >
                                                <span>Resolver</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
