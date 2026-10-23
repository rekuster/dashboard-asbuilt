import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function PowerPointExportCard({
    projectId,
    inputClass,
}: {
    projectId: string;
    inputClass: string;
}) {
    const utils = trpc.useUtils();
    const { data: tokens = [], isLoading } = trpc.export.listTokens.useQuery({ projectId });
    const [tokenName, setTokenName] = useState("Suplemento PowerPoint Semanal");
    const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
    const [selectedEmpresaPreview, setSelectedEmpresaPreview] = useState<string>("Thá");

    const createMutation = trpc.export.createToken.useMutation({
        onSuccess: (res) => {
            setNewlyCreatedToken(res.token);
            toast.success("Token de exportação criado com sucesso!");
            utils.export.listTokens.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error("Erro ao criar token", { description: err.message });
        },
    });

    const revokeMutation = trpc.export.revokeToken.useMutation({
        onSuccess: () => {
            toast.success("Token revogado com sucesso.");
            utils.export.listTokens.invalidate({ projectId });
        },
        onError: (err) => {
            toast.error("Erro ao revogar token", { description: err.message });
        },
    });

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const slideApiUrl = `${origin}/api/export/v1/projects/${projectId}/slide`;

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado para a área de transferência!`);
    };

    return (
        <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
            <CardHeader className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#9C1915]" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Suplemento PowerPoint — API de Exportação & Tokens de Leitura
                        </CardTitle>
                    </div>
                    <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                        Gere tokens revogáveis de leitura para o suplemento do PowerPoint buscar os indicadores (Realidade Aumentada + Modelos As-Built 3D/2D de todas as contratadas) e os gráficos limpos sem precisar de login manual.
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Endpoint da API do Slide (traz dados de todas as edificações e empresas):
                        </span>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white px-2.5 py-1.5 rounded border border-slate-200 text-[11px] font-mono text-slate-700 truncate">
                                {slideApiUrl}
                            </code>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-[11px] font-semibold"
                                onClick={() => copyText(slideApiUrl, "URL da API")}
                            >
                                Copiar URL
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase text-slate-500">
                                Páginas Limpas de Gráficos (Evolução A):
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-semibold text-slate-500">Empresa:</span>
                                {(["Thá", "Ocle", "AeB", "Todas"] as const).map((emp) => (
                                    <button
                                        key={emp}
                                        type="button"
                                        onClick={() => setSelectedEmpresaPreview(emp)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                            selectedEmpresaPreview === emp
                                                ? "bg-[#9C1915] text-white"
                                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                        }`}
                                    >
                                        {emp}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <a
                                href={`/export/${projectId}/grafico/semana`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#9C1915] hover:text-[#9C1915] transition-colors"
                            >
                                ↗ Apontamentos / Semana (774×332)
                            </a>
                            <a
                                href={`/export/${projectId}/grafico/disciplina`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#9C1915] hover:text-[#9C1915] transition-colors"
                            >
                                ↗ Apontamentos / Disciplina (380×332)
                            </a>
                            <a
                                href={`/export/${projectId}/grafico/asbuilt-edificacoes?empresa=${encodeURIComponent(selectedEmpresaPreview)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#9C1915] hover:text-[#9C1915] transition-colors"
                            >
                                ↗ Status Edificações 3D ({selectedEmpresaPreview})
                            </a>
                            <a
                                href={`/export/${projectId}/grafico/asbuilt-painel?empresa=${encodeURIComponent(selectedEmpresaPreview)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#9C1915] hover:text-[#9C1915] transition-colors"
                            >
                                ↗ Painel Completo 3D & 2D ({selectedEmpresaPreview})
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-2.5">
                    <div className="w-full sm:w-80 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-600 block">
                            Descrição do Token Pessoal
                        </label>
                        <input
                            type="text"
                            value={tokenName}
                            onChange={(e) => setTokenName(e.target.value)}
                            placeholder="Ex: Suplemento PowerPoint Semanal"
                            className={`${inputClass} h-8 text-xs`}
                        />
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        disabled={createMutation.isPending || !tokenName.trim()}
                        onClick={() => createMutation.mutate({ projectId, name: tokenName })}
                        className="h-8 px-3 bg-[#9C1915] hover:bg-[#7D1411] text-white font-bold text-xs gap-1.5"
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Plus className="w-3.5 h-3.5" />
                        )}
                        Gerar Token de Leitura
                    </Button>
                </div>

                {newlyCreatedToken && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-900">
                                Copie seu novo Token agora (ele é salvo apenas como hash e não será exibido novamente):
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold"
                                onClick={() => copyText(newlyCreatedToken, "Token de Exportação")}
                            >
                                Copiar Token
                            </Button>
                        </div>
                        <code className="block w-full p-2 rounded bg-white border border-emerald-200 text-xs font-mono text-emerald-950 break-all">
                            {newlyCreatedToken}
                        </code>
                    </div>
                )}

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] h-8 border-b border-slate-200">
                                <th className="py-1.5 px-3">Nome / Identificação</th>
                                <th className="py-1.5 px-3">Prefixo</th>
                                <th className="py-1.5 px-3">Criado em</th>
                                <th className="py-1.5 px-3">Último uso</th>
                                <th className="py-1.5 px-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-slate-400">
                                        Carregando tokens...
                                    </td>
                                </tr>
                            ) : tokens.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                                        Nenhum token de exportação ativo. Clique em "Gerar Token de Leitura" acima.
                                    </td>
                                </tr>
                            ) : (
                                tokens.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50/70">
                                        <td className="py-2 px-3 font-semibold text-slate-800">{t.name}</td>
                                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                            {t.tokenPrefix}
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">
                                            {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">
                                            {t.lastUsedAt
                                                ? new Date(t.lastUsedAt).toLocaleString("pt-BR")
                                                : "Nunca utilizado"}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    revokeMutation.mutate({ projectId, tokenId: t.id })
                                                }
                                                className="px-2 py-0.5 rounded text-[11px] font-semibold text-[#9C1915] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                                            >
                                                Revogar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
