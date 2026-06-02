import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";

interface EdificacaoSelectorProps {
    projectId: string;
    selectedEdificacao: string | null;
    onSelect: (edificacao: string | null) => void;
}

export default function EdificacaoSelector({ projectId, selectedEdificacao, onSelect }: EdificacaoSelectorProps) {
    const { data: edificacoes } = trpc.dashboard.getEdificacoes.useQuery({ projectId });

    return (
        <select
            className="flex h-10 w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedEdificacao || ""}
            onChange={(e) => onSelect(e.target.value || null)}
        >
            <option value="">Todas as Edificações</option>
            {edificacoes?.map((ed: string) => (
                <option key={ed} value={ed}>
                    {ed}
                </option>
            ))}
        </select>
    );
}
