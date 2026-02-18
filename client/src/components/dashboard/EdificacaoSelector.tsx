import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";

interface EdificacaoSelectorProps {
    selectedEdificacao: string | null;
    onSelect: (edificacao: string | null) => void;
}

export default function EdificacaoSelector({ selectedEdificacao, onSelect }: EdificacaoSelectorProps) {
    const { data: edificacoes } = trpc.dashboard.getEdificacoes.useQuery();

    return (
        <div className="flex flex-col space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Filtrar por Edificação</Label>
            <select
                className="flex h-10 w-[280px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedEdificacao || ""}
                onChange={(e) => onSelect(e.target.value || null)}
            >
                <option value="">Todas as Edificações</option>
                {edificacoes?.map((ed) => (
                    <option key={ed} value={ed}>
                        {ed}
                    </option>
                ))}
            </select>
        </div>
    );
}
