/**
 * Este componente cria uma janela (modal) que mostra as salas filtradas por status.
 * Ele é usado quando o usuário clica em uma parte do gráfico de pizza (ex: clicar no amarelo de "Revisar").
 * Mostra uma tabela simples com o nome da sala, edificação e pavimento.
 */

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Layers } from "lucide-react";

interface Room {
    id: string;
    nome: string;
    edificacao: string;
    pavimento: string;
    status: string;
}

interface StatusDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    statusName: string;
    rooms: Room[];
    color: string;
}

export default function StatusDetailsModal({
    isOpen,
    onClose,
    statusName,
    rooms,
    color
}: StatusDetailsModalProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredRooms = rooms.filter(room => 
        room.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.edificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.pavimento.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            Salas com Status: 
                            <Badge 
                                style={{ backgroundColor: color, color: '#fff' }}
                                className="px-3 py-0.5 text-sm font-bold uppercase tracking-wider"
                            >
                                {statusName}
                            </Badge>
                        </DialogTitle>
                        <span className="text-sm font-medium text-slate-500">
                            {rooms.length} {rooms.length === 1 ? 'sala encontrada' : 'salas encontradas'}
                        </span>
                    </div>
                    
                    <div className="relative mt-4 mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por nome, edificação ou pavimento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 bg-slate-50 border-slate-200 focus:ring-primary/20"
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 pt-0">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="font-bold text-xs uppercase text-slate-500">Sala / Ambiente</TableHead>
                                <TableHead className="font-bold text-xs uppercase text-slate-500">Edificação</TableHead>
                                <TableHead className="font-bold text-xs uppercase text-slate-500">Pavimento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRooms.length > 0 ? (
                                filteredRooms.map((room) => (
                                    <TableRow key={room.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100/50">
                                        <TableCell className="py-3">
                                            <span className="font-bold text-slate-700 group-hover:text-primary transition-colors">
                                                {room.nome}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs">{room.edificacao}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs">{room.pavimento}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-slate-400">
                                        Nenhuma sala encontrada para esta busca.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
