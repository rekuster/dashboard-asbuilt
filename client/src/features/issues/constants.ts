export const DISCIPLINE_MAPPING: Record<string, { sigla: string; nome: string; responsavel: string }> = {
    ELE: { sigla: "ELE", nome: "Instalações Elétricas", responsavel: "Ocle" },
    LOG: { sigla: "LOG", nome: "CFTV e Lógica", responsavel: "Ocle" },
    HID: { sigla: "HID", nome: "Instalações Hidrossanitárias", responsavel: "Thá" },
    UTI: { sigla: "UTI", nome: "Utilidades", responsavel: "Ocle" },
    CLI: { sigla: "CLI", nome: "Climatização", responsavel: "Ocle" },
    EST: { sigla: "EST", nome: "Estrutura de Concreto", responsavel: "Thá" },
    MET: { sigla: "MET", nome: "Estrutura Metálica", responsavel: "Thá" },
    ARQ: { sigla: "ARQ", nome: "Arquitetura", responsavel: "Thá" },
    ELEMT: { sigla: "ELEMT", nome: "Média Tensão e Barramentos", responsavel: "Ocle" },
    PCI: { sigla: "PCI", nome: "Proteção Contra Incêndio (PCI)", responsavel: "Ocle" },
    SDAI: { sigla: "SDAI", nome: "Detecção e Alarme (SDAI)", responsavel: "Ocle" },
    SPDA: { sigla: "SPDA", nome: "Para-raios (SPDA)", responsavel: "Ocle" },
};

/**
 * Retorna a sigla canônica única de uma disciplina, evitando duplicações
 * (ex: 'Instalações Elétricas' e 'ELE' resultam ambas em 'ELE')
 */
export const getCanonicalDiscipline = (
    disc: string,
    customConfig?: Array<{ sigla: string; nome: string; responsavel?: string }>
): string => {
    if (!disc) return "OUTROS";
    const clean = disc.trim().toUpperCase();

    // 1. Verifica config customizada do projeto
    if (customConfig && customConfig.length > 0) {
        const found = customConfig.find(
            (c) =>
                c.sigla.toUpperCase() === clean ||
                c.nome.trim().toUpperCase() === clean
        );
        if (found) return found.sigla.toUpperCase();
    }

    // 2. Verifica se já é uma sigla padrão
    if (DISCIPLINE_MAPPING[clean]) {
        return clean;
    }

    // 3. Verifica correspondência por nome
    for (const [sigla, info] of Object.entries(DISCIPLINE_MAPPING)) {
        const infoUpper = info.nome.trim().toUpperCase();
        if (clean === infoUpper || clean.includes(sigla) || infoUpper.includes(clean)) {
            return sigla;
        }
    }

    return clean;
};

/**
 * Retorna o nome formatado de exibição para a disciplina
 */
export const getDisciplineDisplayName = (
    canonicalSigla: string,
    customConfig?: Array<{ sigla: string; nome: string; responsavel?: string }>
): string => {
    if (customConfig && customConfig.length > 0) {
        const found = customConfig.find(
            (c) => c.sigla.toUpperCase() === canonicalSigla.toUpperCase()
        );
        if (found) return `${found.nome} (${found.sigla})`;
    }

    const standard = DISCIPLINE_MAPPING[canonicalSigla.toUpperCase()];
    if (standard) {
        return `${standard.nome} (${standard.sigla})`;
    }

    return canonicalSigla;
};

export const isSameDiscipline = (disc1: string, disc2: string, customConfig?: any[]): boolean => {
    const c1 = getCanonicalDiscipline(disc1, customConfig);
    const c2 = getCanonicalDiscipline(disc2, customConfig);
    return c1 === c2;
};

export const normalizeEdificacao = (name: string) => {
    const n = (name || "").trim().toLowerCase();
    if (n === "produção") return "Prédio Produção";
    if (n === "suporte") return "Prédio Suporte";
    if (n === "central utilidades") return "Central de Utilidades";
    return name;
};

export const statusColors: Record<string, string> = {
    ATIVA: "bg-red-50 text-[#9C1915] border-red-200",
    EM_REVISAO: "bg-amber-50 text-amber-700 border-amber-200",
    RESOLVIDA: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SANADA: "bg-emerald-50 text-emerald-700 border-emerald-200",
    NAO_PROCEDE: "bg-slate-100 text-slate-700 border-slate-200",
};

export const priorityColors: Record<string, string> = {
    BAIXA: "text-slate-400",
    NORMAL: "text-slate-600",
    ALTA: "text-amber-600 font-bold",
    URGENTE: "text-[#9C1915] font-black",
};
