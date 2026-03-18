/*
 * ESTE É O COMPONENTE DE PLANILHA DE APONTAMENTOS.
 * Exibe todos os apontamentos registrados no campo em formato de tabela,
 * com busca, filtragem e agora com a opção de EXCLUIR um apontamento incorreto.
 * Ao excluir, os demais são renumerados automaticamente para não deixar buracos na sequência.
 */

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
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
    // Função chamada após excluir para o pai recarregar os dados
    onDeleted?: () => void;
}

export default function ApontamentosTable({ data, onDeleted }: ApontamentosTableProps) {
    const [search, setSearch] = useState("");

    const utils = trpc.useUtils();

    // Mutação de exclusão — conectada ao backend que apaga e renumera automaticamente
    const deleteMutation = trpc.dashboard.deleteApontamento.useMutation({
        onSuccess: () => {
            toast.success("Apontamento excluído! A numeração foi ajustada automaticamente.");
            // Invalida os dados para forçar recarregamento em toda a aplicação
            utils.dashboard.getApontamentos.invalidate();
            utils.dashboard.getKPIs.invalidate();
            // Notifica o componente pai para recarregar também
            onDeleted?.();
        },
        onError: () => {
            toast.error("Erro ao excluir o apontamento. Tente novamente.");
        }
    });

    // Função chamada ao clicar no botão de lixeira
    const handleDelete = (id: number, numero: number) => {
        // Pede confirmação antes para evitar exclusão acidental
        if (window.confirm(`Tem certeza que deseja excluir o Apontamento Nº ${numero}?\n\nOs números seguintes serão ajustados automaticamente.`)) {
            deleteMutation.mutate({ id });
        }
    };

    // Filtra os dados com base no texto de busca
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
                                <TableHead className="w-[80px] text-white font-bold uppercase text-xs">Nº</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Data</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Edificação</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Pavimento</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Sala</TableHead>
                                <TableHead className="text-white font-bold uppercase text-xs">Disciplina</TableHead>
                                <TableHead className="max-w-[300px] text-white font-bold uppercase text-xs">Divergência</TableHead>
                                {/* Coluna nova para o botão de excluir */}
                                <TableHead className="w-[60px] text-white font-bold uppercase text-xs text-center">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors group">
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
                                        {/* Botão de excluir — aparece em vermelho ao passar o mouse */}
                                        <TableCell className="text-center">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title={`Excluir apontamento Nº ${item.numeroApontamento}`}
                                                className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => handleDelete(item.id, item.numeroApontamento)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
