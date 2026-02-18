import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Apontamento {
    id: number;
    numeroApontamento: number;
    data: Date;
    edificacao: string;
    pavimento: string;
    setor: string;
    sala: string;
    disciplina: string;
    divergencia: string | null;
}

interface ApontamentosTableProps {
    data: Apontamento[];
}

export default function ApontamentosTable({ data }: ApontamentosTableProps) {
    const [search, setSearch] = useState("");

    const filteredData = data.filter((item) => {
        const searchLower = search.toLowerCase();
        return (
            item.sala.toLowerCase().includes(searchLower) ||
            item.disciplina.toLowerCase().includes(searchLower) ||
            item.edificacao.toLowerCase().includes(searchLower) ||
            (item.divergencia?.toLowerCase().includes(searchLower) ?? false)
        );
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento de Apontamentos</CardTitle>
                <div className="w-1/3">
                    <Input
                        placeholder="Buscar por sala, disciplina ou descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-primary hover:bg-primary">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-[100px] text-white font-bold uppercase text-xs">Nº</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Data</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Edificação</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Pavimento</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Sala</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Disciplina</TableHead>
                                <TableHead className="max-w-[300px] text-white font-bold uppercase text-xs">Divergência</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium">{item.numeroApontamento}</TableCell>
                                        <TableCell>{format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                        <TableCell>{item.edificacao}</TableCell>
                                        <TableCell>{item.pavimento}</TableCell>
                                        <TableCell>{item.sala}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                {item.disciplina}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]" title={item.divergencia || ""}>
                                            {item.divergencia || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Nenhum apontamento encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                    Exibindo {filteredData.length} de {data.length} apontamentos
                </div>
            </CardContent>
        </Card>
    );
}
