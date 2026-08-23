import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import dayjs from "dayjs";

interface BatchDeliveryFormModalProps {
    projectId: string;
    selectedEdificacao?: string;
    onClose: () => void;
}

export function BatchDeliveryFormModal({
    projectId,
    selectedEdificacao,
    onClose,
}: BatchDeliveryFormModalProps) {
    const utils = trpc.useUtils();
    const { data: escopos = [] } = trpc.dashboard.getEscopos.useQuery({ projectId });

    const [selectedEmpresa, setSelectedEmpresa] = useState("");
    const [selectedEscopoIds, setSelectedEscopoIds] = useState<number[]>([]);
    const [escopoNames, setEscopoNames] = useState<Record<number, string>>({});
    const [formData, setFormData] = useState({
        nomeDocumento: "",
        tipoDocumento: "rvt",
        dataRecebimento: dayjs().format("YYYY-MM-DD"),
        descricao: "",
        status: "RECEBIDO",
    });

    const empresas = useMemo<string[]>(() => {
        const set = new Set(escopos.map((e: any) => e.empresa));
        return Array.from(set).sort() as string[];
    }, [escopos]);

    const filteredEscopos = useMemo<any[]>(() => {
        return escopos.filter(
            (e: any) =>
                e.empresa === selectedEmpresa &&
                (!selectedEdificacao || e.edificacao === selectedEdificacao)
        );
    }, [escopos, selectedEmpresa, selectedEdificacao]);

    const mutation = trpc.dashboard.upsertEntrega.useMutation({
        onSuccess: () => {
            utils.dashboard.getEntregas.invalidate({ projectId });
            utils.dashboard.getEntregasStats.invalidate({ projectId });
            onClose();
        },
        onError: (err) => alert("Erro ao salvar: " + err.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedEscopoIds.length === 0) {
            alert("Selecione ao menos um modelo.");
            return;
        }
        mutation.mutate({
            ...formData,
            projectId,
            escopoIds: selectedEscopoIds,
            escopoNames: Object.fromEntries(
                Object.entries(escopoNames).map(([k, v]) => [k, v])
            ),
            empresaResponsavel: selectedEmpresa,
            edificacao: selectedEdificacao || "Geral",
            disciplina: "Múltiplas",
            dataPrevista: formData.dataRecebimento,
        } as any);
    };

    const toggleEscopo = (id: number, nomePadrao: string) => {
        setSelectedEscopoIds((prev) => {
            const isRemoving = prev.includes(id);
            if (isRemoving) {
                return prev.filter((i) => i !== id);
            } else {
                if (!escopoNames[id]) {
                    setEscopoNames((curr) => ({ ...curr, [id]: nomePadrao }));
                }
                return [...prev, id];
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-[#940707] p-6 text-white shrink-0">
                    <h2 className="text-xl font-bold">Registrar Entrega de Lote</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                        Vincule múltiplos modelos a um mesmo recebimento / pacote SM
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Empresa Fornecedora *
                            </label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs font-bold"
                                value={selectedEmpresa}
                                onChange={(e) => {
                                    setSelectedEmpresa(e.target.value);
                                    setSelectedEscopoIds([]);
                                }}
                                required
                            >
                                <option value="">Selecione a empresa...</option>
                                {empresas.map((emp: string) => (
                                    <option key={emp} value={emp}>
                                        {emp}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Pasta/Referência da Entrega *
                            </label>
                            <Input
                                required
                                value={formData.nomeDocumento}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nomeDocumento: e.target.value,
                                    })
                                }
                                placeholder="Ex: SM 47 - Modelos Consolidados"
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Data de Recebimento *
                            </label>
                            <Input
                                type="date"
                                required
                                value={formData.dataRecebimento}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        dataRecebimento: e.target.value,
                                    })
                                }
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                                Status Inicial *
                            </label>
                            <select
                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-xs font-bold"
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({ ...formData, status: e.target.value })
                                }
                            >
                                <option value="RECEBIDO">Recebido</option>
                                <option value="EM_REVISAO">Em Revisão</option>
                                <option value="VALIDADO">Validado</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 flex items-center justify-between">
                            <span>
                                Selecionar Modelos Entregues ({selectedEscopoIds.length})
                            </span>
                            {selectedEmpresa && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] font-bold text-primary"
                                    onClick={() => {
                                        const ids = filteredEscopos.map((e: any) => e.id);
                                        setSelectedEscopoIds(ids);
                                        const names = { ...escopoNames };
                                        filteredEscopos.forEach((e: any) => {
                                            if (!names[e.id]) names[e.id] = e.nomeModelo;
                                        });
                                        setEscopoNames(names);
                                    }}
                                >
                                    Selecionar Todos
                                </Button>
                            )}
                        </label>

                        <div className="border rounded-2xl overflow-hidden bg-slate-50/50">
                            {!selectedEmpresa ? (
                                <div className="p-10 text-center text-slate-400 italic text-xs">
                                    Selecione uma empresa para listar os modelos do escopo.
                                </div>
                            ) : filteredEscopos.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 italic text-xs">
                                    Nenhum modelo encontrado no escopo desta empresa para{" "}
                                    {selectedEdificacao || "esta edificação"}.
                                </div>
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto">
                                    <Table>
                                        <TableBody>
                                            {filteredEscopos.map((esc: any) => (
                                                <TableRow
                                                    key={esc.id}
                                                    className={`hover:bg-white cursor-pointer group transition-colors ${
                                                        selectedEscopoIds.includes(esc.id)
                                                            ? "bg-white"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        toggleEscopo(esc.id, esc.nomeModelo)
                                                    }
                                                >
                                                    <TableCell className="w-10 align-top pt-4">
                                                        <Checkbox
                                                            checked={selectedEscopoIds.includes(
                                                                esc.id
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 text-xs">
                                                                {esc.nomeModelo}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase">
                                                                    {esc.disciplina}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {esc.edificacao}
                                                                </span>
                                                            </div>

                                                            {selectedEscopoIds.includes(
                                                                esc.id
                                                            ) && (
                                                                <div
                                                                    className="mt-3 pb-2 animate-in slide-in-from-top-1 duration-200"
                                                                    onClick={(e) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-0.5">
                                                                        Nome do Arquivo
                                                                        Entregue
                                                                    </label>
                                                                    <Input
                                                                        className="h-8 text-xs rounded-lg border-primary/20 bg-white shadow-sm"
                                                                        placeholder="Nome específico..."
                                                                        value={
                                                                            escopoNames[
                                                                                esc.id
                                                                            ] || ""
                                                                        }
                                                                        onChange={(e) =>
                                                                            setEscopoNames(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    [esc.id]:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">
                            Observações da Entrega
                        </label>
                        <Textarea
                            value={formData.descricao}
                            onChange={(e) =>
                                setFormData({ ...formData, descricao: e.target.value })
                            }
                            placeholder="Ex: Entregue via link contendo revisões dos modelos citados."
                            className="resize-none rounded-xl border-slate-200 min-h-[70px] text-xs"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-full text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                mutation.isPending ||
                                !selectedEmpresa ||
                                selectedEscopoIds.length === 0
                            }
                            className="rounded-full px-8 shadow-lg shadow-primary/20 bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold"
                        >
                            {mutation.isPending
                                ? "Registrando..."
                                : `Registrar ${selectedEscopoIds.length} Entregas`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
