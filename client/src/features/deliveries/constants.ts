import { Clock, CheckCircle2, AlertTriangle, CopyCheck } from "lucide-react";

export const DELIVERY_STATUS_OPTIONS = [
    {
        value: "VALIDADO",
        label: "Validado",
        color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        icon: CheckCircle2,
    },
    {
        value: "COM_PENDENCIAS",
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
    {
        value: "IGUAL_PROJETO",
        label: "Entregue Igual ao Projeto",
        color: "bg-red-50 text-[#9C1915] border-red-300 font-bold",
        icon: CopyCheck,
    },
];

export const MODELO_STATUS_OPTIONS = [
    {
        value: "VALIDADO",
        label: "🟩 Validado (Conforme Executado)",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-300",
    },
    {
        value: "COM_PENDENCIAS",
        label: "🟨 Entregue com Pendências",
        color: "text-amber-700",
        bg: "bg-amber-50 border-amber-300",
    },
    {
        value: "IGUAL_PROJETO",
        label: "🟥 Entregue Igual ao Projeto",
        color: "text-[#9C1915]",
        bg: "bg-red-50 border-red-300",
    },
    {
        value: "NAO_ENTREGUE",
        label: "⬜ Não Entregue",
        color: "text-slate-600",
        bg: "bg-slate-100 border-slate-300",
    },
];

export const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    VALIDADO: {
        label: "Validado",
        color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        icon: CheckCircle2,
    },
    COM_PENDENCIAS: {
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
    IGUAL_PROJETO: {
        label: "Entregue Igual ao Projeto",
        color: "bg-red-50 text-[#9C1915] border-red-300 font-bold",
        icon: CopyCheck,
    },
    NAO_ENTREGUE: {
        label: "Não Entregue",
        color: "bg-slate-100 text-slate-700 border-slate-300 font-semibold",
        icon: Clock,
    },
    // Normalização de registros existentes no banco
    AGUARDANDO: {
        label: "Não Entregue",
        color: "bg-slate-100 text-slate-700 border-slate-300 font-semibold",
        icon: Clock,
    },
    RECEBIDO: {
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
    EM_REVISAO: {
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
    VALIDADO_PARCIAL: {
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
    VALIDADO_RESSALVA: {
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
    REJEITADO: {
        label: "Entregue c/ Pendências",
        color: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
        icon: AlertTriangle,
    },
};

export const DOC_TYPES: Record<string, string> = {
    rvt: "Revit (RVT)",
    ifc: "IFC",
    nwd: "Navisworks (NWD)",
    dwg: "DWG",
    relatorio: "Relatório Técnico",
    pdf: "PDF",
};
