export default function ColorLegend() {
    const categories = [
        { color: "#22c55e", label: "Verificada", status: "Sala verificada e aprovada" },
        { color: "#eab308", label: "Em Revisão", status: "Requer revisão ou ajustes" },
        { color: "#ef4444", label: "Crítico", status: "Mais de 10 apontamentos" },
        { color: "#9ca3af", label: "Pendente", status: "Aguardando verificação" },
        { color: "#3b82f6", label: "Selecionado", status: "Sala selecionada no visualizador" },
    ];

    return (
        <div className="bg-slate-800/80 backdrop-blur-md p-3 rounded-lg border border-slate-700 shadow-lg">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Status das Salas</h4>
            <div className="space-y-2">
                {categories.map((cat) => (
                    <div key={cat.label} className="flex items-center gap-3">
                        <div
                            className="w-3 h-3 rounded-full border border-white/10 shrink-0"
                            style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-slate-200 leading-tight">{cat.label}</span>
                            <span className="text-[9px] text-slate-500 leading-tight">{cat.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
