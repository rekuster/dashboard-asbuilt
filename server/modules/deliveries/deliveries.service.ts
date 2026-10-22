import { eq, and, sql, desc } from "drizzle-orm";
import {
    getDb,
    escopoAsBuilt,
    entregasAsBuilt,
    entregasHistorico,
    type EscopoAsBuilt,
    type EntregaAsBuilt,
    type InsertEscopoAsBuilt,
    type InsertEntregaAsBuilt,
} from "../../common/db";
import { format, startOfWeek, differenceInCalendarWeeks, addWeeks } from "date-fns";

let _escopoColumnsEnsured = false;

export async function ensureEscopoColumns(db: any) {
    if (_escopoColumnsEnsured || !db) return;
    try {
        await db.execute(sql`ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "statusModelo" text`);
        await db.execute(sql`ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "totalPranchas" integer DEFAULT 0`);
        await db.execute(sql`ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "pranchasValidadas" integer DEFAULT 0`);
        await db.execute(sql`ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "statusPranchas" text DEFAULT 'NAO_ENTREGUE'`);
        await db.execute(sql`ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "parecerTecnico" text`);
        _escopoColumnsEnsured = true;
    } catch (e) {
        console.warn("[Deliveries] Could not auto-migrate escopoAsBuilt columns:", e);
    }
}

/**
 * Mapa de pranchas 2D (.dwg / .pdf) extraído da estrutura de pastas do SteclaCloud
 * (Links: DAY6LitEJX8KJsA e b6GLxAeESsGgrfw)
 */
export function inferSteclaPranchas(edificacao?: string | null, disciplina?: string | null): number {
    const ed = (edificacao || "").toLowerCase();
    const di = (disciplina || "").toLowerCase();

    const isProd = ed.includes("produ");
    const isSup = ed.includes("suporte");
    const isImp = ed.includes("implanta");
    const isCut = ed.includes("utilidades") || ed.includes("central");
    const isPort = ed.includes("portaria");
    const isSede = ed.includes("sede") || ed.includes("recrea");
    const isEte = ed.includes("ete");
    const isBrig = ed.includes("brigada");

    if (di.includes("elétrica") || di.includes("eletrica")) {
        if (isProd) return 29;
        if (isSup) return 11;
        if (isCut) return 3;
        if (isImp) return 2;
        if (isEte) return 4;
        return 2;
    }
    if (di.includes("lógica") || di.includes("logica") || di.includes("cftv") || di.includes("cabeamento")) {
        if (isProd) return 12;
        if (isSup) return 3;
        if (isCut) return 1;
        if (isImp) return 1;
        return 1;
    }
    if (di.includes("hidro")) {
        if (isProd) return 42;
        if (isSup) return 8;
        if (isSede) return 6;
        if (isCut) return 3;
        if (isEte) return 3;
        if (isImp) return 2;
        if (isPort || isBrig) return 1;
        return 2;
    }
    if (di.includes("climatiza") || di.includes("hvac") || di.includes("ar condicionado")) {
        if (isProd) return 40;
        if (isSup) return 7;
        if (isCut) return 4;
        if (isPort) return 3;
        if (isEte) return 2;
        return 4;
    }
    if (di.includes("utilidades") || di.includes("ar comprimido") || di.includes("vapor")) {
        if (isProd) return 3; // 3 pranchas na última revisão executiva (24 no total geral)
        return 2;
    }
    if (di.includes("gás") || di.includes("gas") || di.includes("glp")) {
        return 2;
    }
    if (di.includes("incêndio") || di.includes("incendio") || di.includes("pci") || di.includes("spk") || di.includes("hidrante")) {
        if (isProd) return 32;
        if (isSup) return 6;
        if (isCut) return 4;
        if (isImp) return 1;
        return 4;
    }
    if (di.includes("spda")) {
        if (isProd) return 6;
        if (isSup) return 3;
        return 1;
    }
    if (di.includes("sdai")) {
        if (isProd) return 10;
        return 1;
    }
    if (di.includes("sala limpa")) {
        if (di.includes("arq")) return 19;
        if (di.includes("cli")) return 18;
        return 18;
    }
    if (di.includes("arquitetura")) {
        if (isProd) return 15;
        if (isSup) return 6;
        if (isCut) return 6;
        if (isImp) return 5;
        if (isEte) return 3;
        if (isPort || isSede) return 2;
        return 2;
    }
    if (di.includes("metálica") || di.includes("metalica")) {
        if (isProd) return 29;
        if (isSup) return 11;
        if (isPort) return 9;
        if (isCut) return 7;
        return 3;
    }
    if (di.includes("concreto") || di.includes("estrutura")) {
        if (isProd) return 11;
        if (isSede) return 33;
        if (isPort) return 17;
        if (isBrig) return 8;
        if (isCut) return 3;
        return 6;
    }
    if (di.includes("funda")) {
        if (isProd) return 11;
        return 1;
    }
    if (di.includes("drenagem")) return 4;
    if (di.includes("terraplanagem")) return 3;
    if (di.includes("pavimenta")) return 1;
    if (di.includes("piso")) return 8;
    if (di.includes("média tensão") || di.includes("media tensao") || di.includes("barramento")) return 9;
    if (di.includes("automa")) return 24;
    if (di.includes("interiores")) {
        if (isSup) return 18;
        if (isProd) return 10;
        return 7;
    }
    return 0;
}

export function resolveEscopoAuditStatus(escopo: any, matchedEntregas: any[]): string {
    if (escopo.statusModelo && escopo.statusModelo !== "AUTO") {
        return escopo.statusModelo;
    }
    if (matchedEntregas.length === 0) {
        if (escopo.obsTha && escopo.obsTha.toLowerCase().includes("igual ao projeto")) {
            return "IGUAL_PROJETO";
        }
        return "NAO_ENTREGUE";
    }

    const sorted = [...matchedEntregas].sort((a, b) => {
        const dateA = a.dataRecebimento ? new Date(a.dataRecebimento).getTime() : 0;
        const dateB = b.dataRecebimento ? new Date(b.dataRecebimento).getTime() : 0;
        return dateB - dateA;
    });
    const latest = sorted[0];
    const latestStatus = (latest?.status || "").toUpperCase();

    if (latestStatus === "VALIDADO" || latest?.resultado === "CONFORME") return "VALIDADO";
    if (latestStatus === "IGUAL_PROJETO") return "IGUAL_PROJETO";
    if (
        latestStatus === "COM_PENDENCIAS" ||
        latestStatus === "EM_REVISAO" ||
        latestStatus === "VALIDADO_PARCIAL" ||
        latestStatus === "REJEITADO"
    ) {
        return "COM_PENDENCIAS";
    }

    const hasValidado = matchedEntregas.some(
        (e: any) => e.status === "VALIDADO" || e.resultado === "CONFORME"
    );
    const hasIgualProjeto = matchedEntregas.some(
        (e: any) =>
            e.status === "IGUAL_PROJETO" ||
            (e.descricao && e.descricao.toLowerCase().includes("igual ao projeto"))
    );

    if (hasValidado) return "VALIDADO";
    if (hasIgualProjeto) return "IGUAL_PROJETO";
    return "COM_PENDENCIAS";
}

const seededScopeProjects = new Set<string>();

export async function getEscopos(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    await ensureEscopoColumns(db);

    if (!seededScopeProjects.has(projectId)) {
        seededScopeProjects.add(projectId);
        try {
            await sincronizarSteclaCloud(projectId);
        } catch (err) {
            console.warn("Auto-seed escopo ETE/pranchas:", err);
        }
    }

    const escopos = await db
        .select()
        .from(escopoAsBuilt)
        .where(eq(escopoAsBuilt.projectId, projectId))
        .orderBy(escopoAsBuilt.empresa, escopoAsBuilt.edificacao, escopoAsBuilt.disciplina);

    const entregas = await db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, projectId));

    return escopos.map((escopo: any) => {
        const matchedEntregas = entregas.filter(
            (e: any) =>
                (e.escopoId && e.escopoId === escopo.id) ||
                (e.disciplina?.toLowerCase() === escopo.disciplina?.toLowerCase() &&
                    e.edificacao?.toLowerCase() === escopo.edificacao?.toLowerCase() &&
                    e.empresaResponsavel?.toLowerCase() === escopo.empresa?.toLowerCase())
        );

        const sorted = [...matchedEntregas].sort((a, b) => {
            const dateA = a.dataRecebimento ? new Date(a.dataRecebimento).getTime() : 0;
            const dateB = b.dataRecebimento ? new Date(b.dataRecebimento).getTime() : 0;
            return dateB - dateA;
        });

        const latestEntrega = sorted[0] || null;
        const statusAuditoria = resolveEscopoAuditStatus(escopo, matchedEntregas);

        const inferredPranchas = inferSteclaPranchas(escopo.edificacao, escopo.disciplina);
        const totalPranchas =
            escopo.totalPranchas && escopo.totalPranchas > 0
                ? escopo.totalPranchas
                : inferredPranchas;
        const pranchasValidadas = escopo.pranchasValidadas ?? 0;
        const statusPranchas =
            escopo.statusPranchas ||
            (totalPranchas > 0 && pranchasValidadas >= totalPranchas
                ? "VALIDADO"
                : pranchasValidadas > 0
                ? "COM_PENDENCIAS"
                : "NAO_ENTREGUE");

        const parecerTecnico =
            escopo.parecerTecnico ||
            escopo.pendenciaRvt ||
            escopo.obsTha ||
            latestEntrega?.apontamentosVerificacao ||
            latestEntrega?.descricao ||
            null;

        const smsUnicas = Array.from(
            new Set(sorted.map((e: any) => e.identificadorEntrega).filter(Boolean))
        );

        return {
            ...escopo,
            totalEntregas: matchedEntregas.length,
            statusAuditoria,
            totalPranchas,
            pranchasValidadas,
            statusPranchas,
            parecerTecnico,
            smsRecentes: smsUnicas.slice(0, 4),
            ultimaEntregaData: latestEntrega?.dataRecebimento || null,
            ultimaEntregaIdentificador: latestEntrega?.identificadorEntrega || null,
        };
    });
}

export async function upsertEscopo(data: {
    id?: number;
    projectId?: string | null;
    empresa: string;
    disciplina: string;
    edificacao: string;
    nomeModelo: string;
    nomeModeloFinal?: string;
    descricao?: string | null;
    temRvtOriginal?: number;
    pendenciaRvt?: string | null;
    acaoRvt?: string | null;
    ativo?: number;
    statusModelo?: string | null;
    totalPranchas?: number;
    pranchasValidadas?: number;
    statusPranchas?: string | null;
    parecerTecnico?: string | null;
}) {
    const db = await getDb();
    if (!db) return null;

    await ensureEscopoColumns(db);

    if (data.id) {
        const updatePayload: any = {
            ...data,
            updatedAt: new Date(),
        };
        delete updatePayload.id;
        const [result] = await db
            .update(escopoAsBuilt)
            .set(updatePayload)
            .where(eq(escopoAsBuilt.id, data.id))
            .returning();
        return result;
    } else {
        const [result] = await db
            .insert(escopoAsBuilt)
            .values({
                projectId: data.projectId || null,
                empresa: data.empresa,
                disciplina: data.disciplina,
                edificacao: data.edificacao,
                nomeModelo: data.nomeModelo,
                nomeModeloFinal: data.nomeModeloFinal || null,
                descricao: data.descricao || null,
                temRvtOriginal: data.temRvtOriginal ?? 0,
                pendenciaRvt: data.pendenciaRvt || null,
                acaoRvt: data.acaoRvt || null,
                ativo: data.ativo ?? 1,
                statusModelo: data.statusModelo || "NAO_ENTREGUE",
                totalPranchas:
                    data.totalPranchas ?? inferSteclaPranchas(data.edificacao, data.disciplina),
                pranchasValidadas: data.pranchasValidadas ?? 0,
                statusPranchas: data.statusPranchas || "NAO_ENTREGUE",
                parecerTecnico: data.parecerTecnico || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();
        return result;
    }
}

export async function quickUpdateEscopo(data: {
    id: number;
    statusModelo?: string;
    temRvtOriginal?: number;
    totalPranchas?: number;
    pranchasValidadas?: number;
    statusPranchas?: string;
    parecerTecnico?: string | null;
}) {
    const db = await getDb();
    if (!db) return null;

    await ensureEscopoColumns(db);

    const payload: any = { updatedAt: new Date() };
    if (data.statusModelo !== undefined) payload.statusModelo = data.statusModelo;
    if (data.temRvtOriginal !== undefined) payload.temRvtOriginal = data.temRvtOriginal;
    if (data.totalPranchas !== undefined) payload.totalPranchas = data.totalPranchas;
    if (data.pranchasValidadas !== undefined) payload.pranchasValidadas = data.pranchasValidadas;
    if (data.statusPranchas !== undefined) payload.statusPranchas = data.statusPranchas;
    if (data.parecerTecnico !== undefined) payload.parecerTecnico = data.parecerTecnico;

    const [updated] = await db
        .update(escopoAsBuilt)
        .set(payload)
        .where(eq(escopoAsBuilt.id, data.id))
        .returning();

    return updated;
}

export async function registrarQuinzenaModulos(data: {
    projectId: string;
    identificadorEntrega: string;
    dataRecebimento: string | Date;
    itens: Array<{
        escopoId: number;
        statusModelo: string;
        entregouModelo3d?: boolean;
        entregouPranchas2d?: boolean;
        totalPranchas?: number;
        pranchasValidadas?: number;
        statusPranchas?: string;
        parecerTecnico?: string | null;
    }>;
}) {
    const db = await getDb();
    if (!db) return [];

    await ensureEscopoColumns(db);

    const dataRec =
        typeof data.dataRecebimento === "string"
            ? new Date(data.dataRecebimento + "T12:00:00")
            : data.dataRecebimento || new Date();

    const current = await db
        .select({ numeroEntrega: entregasAsBuilt.numeroEntrega })
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, data.projectId));

    let nextNum = current.reduce((max, c) => Math.max(max, c.numeroEntrega || 0), 0);
    const createdDeliveries = [];

    for (const item of data.itens) {
        const [esc] = await db
            .select()
            .from(escopoAsBuilt)
            .where(eq(escopoAsBuilt.id, item.escopoId))
            .limit(1);
        if (!esc) continue;

        const escUpdate: any = {
            statusModelo: item.statusModelo,
            updatedAt: new Date(),
        };
        if (item.parecerTecnico !== undefined) escUpdate.parecerTecnico = item.parecerTecnico;
        if (item.totalPranchas !== undefined) escUpdate.totalPranchas = item.totalPranchas;
        if (item.pranchasValidadas !== undefined) escUpdate.pranchasValidadas = item.pranchasValidadas;
        if (item.statusPranchas !== undefined) escUpdate.statusPranchas = item.statusPranchas;

        await db
            .update(escopoAsBuilt)
            .set(escUpdate)
            .where(eq(escopoAsBuilt.id, esc.id));

        if (item.entregouModelo3d !== false) {
            nextNum++;
            const docName = esc.nomeModeloFinal || esc.nomeModelo;
            const [row3d] = await db
                .insert(entregasAsBuilt)
                .values({
                    projectId: data.projectId,
                    escopoId: esc.id,
                    numeroEntrega: nextNum,
                    identificadorEntrega: data.identificadorEntrega,
                    nomeDocumento: docName,
                    tipoDocumento: "rvt",
                    formato: esc.temRvtOriginal === 1 ? "rvt" : "ifc",
                    isModelo: 1,
                    edificacao: esc.edificacao,
                    disciplina: esc.disciplina,
                    empresaResponsavel: esc.empresa,
                    dataPrevista: dataRec,
                    dataRecebimento: dataRec,
                    status: item.statusModelo,
                    resultado:
                        item.statusModelo === "VALIDADO"
                            ? "CONFORME"
                            : item.statusModelo === "COM_PENDENCIAS" || item.statusModelo === "IGUAL_PROJETO"
                            ? "NAO_CONFORME"
                            : null,
                    apontamentosVerificacao: item.parecerTecnico || null,
                    descricao: item.parecerTecnico || `Check-in quinzenal (${data.identificadorEntrega})`,
                    modeloBaseReferencia: esc.nomeModelo,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            if (row3d) {
                createdDeliveries.push(row3d);
                await db.insert(entregasHistorico).values({
                    entregaId: row3d.id,
                    acao: "CRIADO",
                    descricao: `Recebimento quinzenal [${data.identificadorEntrega}] — Status: ${item.statusModelo}${
                        item.parecerTecnico ? ` | Parecer: ${item.parecerTecnico}` : ""
                    }`,
                    usuario: "Usuário",
                    createdAt: new Date(),
                });
            }
        }

        if (item.entregouPranchas2d) {
            nextNum++;
            const doc2dName = `Pranchas 2D (DWG/PDF) - ${esc.disciplina} (${esc.edificacao})`;
            const st2d = item.statusPranchas || item.statusModelo;
            const [row2d] = await db
                .insert(entregasAsBuilt)
                .values({
                    projectId: data.projectId,
                    escopoId: esc.id,
                    numeroEntrega: nextNum,
                    identificadorEntrega: data.identificadorEntrega,
                    nomeDocumento: doc2dName,
                    tipoDocumento: "dwg",
                    formato: "dwg",
                    isModelo: 0,
                    edificacao: esc.edificacao,
                    disciplina: esc.disciplina,
                    empresaResponsavel: esc.empresa,
                    dataPrevista: dataRec,
                    dataRecebimento: dataRec,
                    status: st2d,
                    apontamentosVerificacao: item.parecerTecnico || null,
                    descricao: `Documentação 2D (${item.pranchasValidadas ?? 0}/${
                        item.totalPranchas ?? esc.totalPranchas ?? 0
                    } pranchas) — ${data.identificadorEntrega}`,
                    modeloBaseReferencia: esc.nomeModelo,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            if (row2d) createdDeliveries.push(row2d);
        }
    }

    return createdDeliveries;
}

export async function sincronizarSteclaCloud(projectId: string) {
    const db = await getDb();
    if (!db) return { updatedModels: 0, addedAebModels: 0, addedAebDeliveries: 0 };

    await ensureEscopoColumns(db);

    const existingEscopos = await db
        .select()
        .from(escopoAsBuilt)
        .where(eq(escopoAsBuilt.projectId, projectId));

    let updatedModels = 0;
    for (const esc of existingEscopos) {
        const inferred = inferSteclaPranchas(esc.edificacao, esc.disciplina);
        if ((!esc.totalPranchas || esc.totalPranchas === 0) && inferred > 0) {
            await db
                .update(escopoAsBuilt)
                .set({ totalPranchas: inferred, updatedAt: new Date() })
                .where(eq(escopoAsBuilt.id, esc.id));
            updatedModels++;
        }
    }

    // Modelos Base da AeB (ETE) encontrados na pasta 4. Projetos/001. As Built/001. Entregáveis As Built/ETE/
    const aebEteModels = [
        {
            disciplina: "Arquitetura",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-00-ARQ-MO-ETE1-R02.rvt",
            nomeModeloFinal: "NEO-23001-AS-ARQ-001-ETE1-R00.rvt",
            temRvtOriginal: 1,
            totalPranchas: 3,
            statusModelo: "NAO_ENTREGUE",
            parecerTecnico: "Modelo base RVT disponível no SteclaCloud. Aguardando entrega As-Built.",
        },
        {
            disciplina: "Estrutura de Concreto",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-CON-MO-ETE1-R00.ifc",
            nomeModeloFinal: "NEO-23001-AS-CON-001-ETE1-R00.rvt",
            temRvtOriginal: 0,
            totalPranchas: 8,
            statusModelo: "NAO_ENTREGUE",
            parecerTecnico: "Aguardando entrega de modelo As-Built de estrutura da ETE.",
        },
        {
            disciplina: "Hidrossanitário",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-16-HID-MO-INFRA-R00.rvt",
            nomeModeloFinal: "NEO-23001-AS-HID-001-INFRA-R00.rvt",
            temRvtOriginal: 1,
            totalPranchas: 3,
            statusModelo: "COM_PENDENCIAS",
            parecerTecnico: "Última entrega recebida na SM 41 (15/10/2026) - pendente de validação técnica final.",
        },
        {
            disciplina: "Elétrica",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-ELE-MO-INFRA-R00.rvt",
            nomeModeloFinal: "NEO-23001-AS-ELE-001-INFRA-R00.rvt",
            temRvtOriginal: 1,
            totalPranchas: 4,
            statusModelo: "COM_PENDENCIAS",
            parecerTecnico: "Última entrega recebida na SM 41 (15/10/2026) + DWG na SM 17 - pendente validar últimas revisões.",
        },
        {
            disciplina: "Estrutura Metálica",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-MET-MO-ETE1-R00.ifc",
            nomeModeloFinal: "NEO-23001-AS-MET-001-ETE1-R00.rvt",
            temRvtOriginal: 0,
            totalPranchas: 3,
            statusModelo: "NAO_ENTREGUE",
            parecerTecnico: "Aguardando entrega As-Built.",
        },
        {
            disciplina: "Drenagem",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-DRE-MO-ETE1-R00.ifc",
            nomeModeloFinal: "NEO-23001-AS-DRE-001-ETE1-R00.rvt",
            temRvtOriginal: 0,
            totalPranchas: 2,
            statusModelo: "NAO_ENTREGUE",
            parecerTecnico: "Aguardando entrega As-Built.",
        },
        {
            disciplina: "Pavimentação",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-PAV-MO-ETE1-R00.ifc",
            nomeModeloFinal: "NEO-23001-AS-PAV-001-ETE1-R00.rvt",
            temRvtOriginal: 0,
            totalPranchas: 1,
            statusModelo: "NAO_ENTREGUE",
            parecerTecnico: "Aguardando entrega As-Built.",
        },
        {
            disciplina: "PCI",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-PCI-MO-ETE1-R00.ifc",
            nomeModeloFinal: "NEO-23001-AS-PCI-001-ETE1-R00.rvt",
            temRvtOriginal: 0,
            totalPranchas: 2,
            statusModelo: "NAO_ENTREGUE",
            parecerTecnico: "Aguardando entrega As-Built.",
        },
        {
            disciplina: "Climatização",
            edificacao: "ETE",
            nomeModelo: "NEO-23001-PE-MEC-001-INFRA-R01.ifc",
            nomeModeloFinal: "NEO-23001-PE-CLI-001-INFRA-R00.rvt",
            temRvtOriginal: 1,
            totalPranchas: 2,
            statusModelo: "COM_PENDENCIAS",
            parecerTecnico: "Entregue nas SMs 28 (09/07/2026) e SM 32 (06/08/2026) - pendente de validação.",
        },
    ];

    let addedAebModels = 0;
    const aebScopeMap: Record<string, number> = {};

    for (const m of aebEteModels) {
        const found = existingEscopos.find(
            (e: any) =>
                e.edificacao?.toLowerCase() === "ete" &&
                e.disciplina?.toLowerCase() === m.disciplina.toLowerCase()
        );
        if (found) {
            aebScopeMap[m.disciplina] = found.id;
            if (found.empresa?.toLowerCase() === "aeb") {
                await db
                    .update(escopoAsBuilt)
                    .set({ empresa: "Ocle", updatedAt: new Date() })
                    .where(eq(escopoAsBuilt.id, found.id));
            }
        } else {
            const [inserted] = await db
                .insert(escopoAsBuilt)
                .values({
                    projectId,
                    empresa: "Ocle",
                    disciplina: m.disciplina,
                    edificacao: m.edificacao,
                    nomeModelo: m.nomeModelo,
                    nomeModeloFinal: m.nomeModeloFinal,
                    temRvtOriginal: m.temRvtOriginal,
                    totalPranchas: m.totalPranchas,
                    pranchasValidadas: 0,
                    statusPranchas: "NAO_ENTREGUE",
                    statusModelo: m.statusModelo,
                    parecerTecnico: m.parecerTecnico,
                    ativo: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();
            if (inserted) {
                addedAebModels++;
                aebScopeMap[m.disciplina] = inserted.id;
            }
        }
    }

    const aebSms = [
        { sm: "01. SM 09 - 25.02.2026", date: "2026-02-25", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 26.02-R00.rvt", fmt: "rvt" },
        { sm: "02. SM 11 - 11.03.2026", date: "2026-03-11", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 11.03-R00.rvt", fmt: "rvt" },
        { sm: "02. SM 11 - 11.03.2026", date: "2026-03-11", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 11.03-R00.rvt", fmt: "rvt" },
        { sm: "03. SM 13 - 25.03.2026", date: "2026-03-25", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 25.03-R00.rvt", fmt: "rvt" },
        { sm: "03. SM 13 - 25.03.2026", date: "2026-03-25", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 25.03-R00.rvt", fmt: "rvt" },
        { sm: "04. SM 15 - 08.04.2026", date: "2026-04-08", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 08.04-R00.rvt", fmt: "rvt" },
        { sm: "05. SM 17 - 22.04.2026", date: "2026-04-22", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 22.04-R00.rvt", fmt: "rvt" },
        { sm: "05. SM 17 - 22.04.2026", date: "2026-04-22", disc: "Elétrica", doc: "NEO-23001-PE-16-HID-DE-101-R00-INFRA ELETRICA SUPERNOVA.dwg", fmt: "dwg" },
        { sm: "06. SM 19 - 06.05.2026", date: "2026-05-06", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 06.05-R00.rvt", fmt: "rvt" },
        { sm: "07. SM 22 - 04.06.2026", date: "2026-06-04", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 04.06-R00.rvt", fmt: "rvt" },
        { sm: "07. SM 22 - 04.06.2026", date: "2026-06-04", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 04.06-R00.rvt", fmt: "rvt" },
        { sm: "08. SM 28 - 09.07.2026", date: "2026-07-09", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 09.07-R00.rvt", fmt: "rvt" },
        { sm: "08. SM 28 - 09.07.2026", date: "2026-07-09", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 09.07-R00.rvt", fmt: "rvt" },
        { sm: "08. SM 28 - 09.07.2026", date: "2026-07-09", disc: "Climatização", doc: "NEO-23001-PE-CLI-001-INFRA-R00.rvt", fmt: "rvt" },
        { sm: "09. SM 30 - 23.07.2026", date: "2026-07-23", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 23.07-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "10. SM 32 - 06.08.2026", date: "2026-08-06", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 06.08-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "10. SM 32 - 06.08.2026", date: "2026-08-06", disc: "Climatização", doc: "NEO-23001-PE-CLI-001-INFRA 06.08-R00.rvt", fmt: "rvt" },
        { sm: "11. SM 34 - 20.08.2026", date: "2026-08-20", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 20.08-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "11. SM 34 - 20.08.2026", date: "2026-08-20", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 20.08-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "12. SM 36 - 03.09.2026", date: "2026-09-03", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 20.08-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "12. SM 36 - 03.09.2026", date: "2026-09-03", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 03.09-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "13. SM 41 - 15.10.2026", date: "2026-10-15", disc: "Elétrica", doc: "NEO-23001-AS-ELE-001-INFRA 15.10-R00_desanexado.rvt", fmt: "rvt" },
        { sm: "13. SM 41 - 15.10.2026", date: "2026-10-15", disc: "Hidrossanitário", doc: "NEO-23001-AS-HID-001-INFRA 15.10-R00_desanexado.rvt", fmt: "rvt" },
    ];

    const existingEntregas = await db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, projectId));

    let nextNum = existingEntregas.reduce((max: number, c: any) => Math.max(max, c.numeroEntrega || 0), 0);
    let addedAebDeliveries = 0;

    for (const item of aebSms) {
        const alreadyExists = existingEntregas.some(
            (e: any) =>
                e.identificadorEntrega === item.sm &&
                e.nomeDocumento === item.doc
        );
        if (!alreadyExists) {
            nextNum++;
            const dt = new Date(item.date + "T12:00:00");
            await db.insert(entregasAsBuilt).values({
                projectId,
                escopoId: aebScopeMap[item.disc] || null,
                numeroEntrega: nextNum,
                identificadorEntrega: item.sm,
                nomeDocumento: item.doc,
                tipoDocumento: item.fmt === "rvt" ? "rvt" : "dwg",
                formato: item.fmt,
                isModelo: item.fmt === "rvt" ? 1 : 0,
                edificacao: "ETE",
                disciplina: item.disc,
                empresaResponsavel: "Ocle",
                dataPrevista: dt,
                dataRecebimento: dt,
                status: "COM_PENDENCIAS",
                descricao: "Sincronizado da pasta ETE (Ocle) no SteclaCloud — pendente validação",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            addedAebDeliveries++;
        }
    }

    return { updatedModels, addedAebModels, addedAebDeliveries };
}

export async function deleteEscopo(id: number) {
    const db = await getDb();
    if (!db) return false;

    await db.delete(escopoAsBuilt).where(eq(escopoAsBuilt.id, id));
    return true;
}

export async function getEntregas(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, projectId))
        .orderBy(desc(entregasAsBuilt.numeroEntrega), desc(entregasAsBuilt.dataRecebimento));
}

export async function getEntregasByEscopo(escopoId: number) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.escopoId, escopoId))
        .orderBy(desc(entregasAsBuilt.dataPrevista));
}

export async function getEntregasHistorico(id: number) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(entregasHistorico)
        .where(eq(entregasHistorico.entregaId, id))
        .orderBy(desc(entregasHistorico.createdAt));
}

export async function upsertEntrega(data: any) {
    const db = await getDb();
    if (!db) return null;

    const { id, comentario, ...rawValues } = data;

    const values = Object.fromEntries(
        Object.entries(rawValues).filter(([_, v]) => v !== undefined)
    ) as any;

    const normalizeDate = (d: any) => {
        if (!d) return d;
        if (typeof d === "string") {
            return new Date(d + "T12:00:00");
        }
        if (d instanceof Date) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
        }
        return d;
    };

    if (values.dataPrevista) values.dataPrevista = normalizeDate(values.dataPrevista);
    if (values.dataRecebimento) values.dataRecebimento = normalizeDate(values.dataRecebimento);
    if (values.periodoInicio) values.periodoInicio = normalizeDate(values.periodoInicio);
    if (values.periodoFim) values.periodoFim = normalizeDate(values.periodoFim);
    if (values.dataVerificacao) values.dataVerificacao = normalizeDate(values.dataVerificacao);

    const { escopoIds, escopoNames, ...commonValues } = values;

    if (escopoIds && Array.isArray(escopoIds)) {
        return await db.transaction(async (tx: any) => {
            const batchResults = [];
            for (const escId of escopoIds) {
                const [esc] = await tx
                    .select()
                    .from(escopoAsBuilt)
                    .where(eq(escopoAsBuilt.id, escId))
                    .limit(1);
                if (!esc) continue;

                const individualName =
                    (escopoNames && escopoNames[String(escId)]) || commonValues.nomeDocumento;

                const newRecord = await tx
                    .insert(entregasAsBuilt)
                    .values({
                        ...commonValues,
                        nomeDocumento: individualName,
                        escopoId: escId,
                        edificacao: commonValues.edificacao || esc.edificacao,
                        disciplina: commonValues.disciplina || esc.disciplina,
                        empresaResponsavel: commonValues.empresaResponsavel || esc.empresa,
                        identificadorEntrega: commonValues.identificadorEntrega || null,
                        formato: commonValues.formato || null,
                        isModelo: commonValues.isModelo ?? 0,
                        modeloBaseReferencia: commonValues.modeloBaseReferencia || null,
                        acoesNecessarias: commonValues.acoesNecessarias || null,
                        checkpointBep: commonValues.checkpointBep || null,
                        avancoFisico: commonValues.avancoFisico || null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .returning();

                if (newRecord && newRecord.length > 0) {
                    batchResults.push(newRecord[0]);
                    await tx.insert(entregasHistorico).values({
                        entregaId: newRecord[0].id,
                        acao: "CRIADO",
                        descricao: `Entrega em lote criada: ${individualName}`,
                        usuario: "Usuário",
                        createdAt: new Date(),
                    });
                }
            }
            return batchResults;
        });
    }

    let result;
    if (id) {
        const current = await db
            .select()
            .from(entregasAsBuilt)
            .where(eq(entregasAsBuilt.id, id))
            .limit(1);
        const oldStatus = current.length > 0 ? current[0].status : null;

        result = await db
            .update(entregasAsBuilt)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(entregasAsBuilt.id, id))
            .returning();

        if (oldStatus && values.status && oldStatus !== values.status) {
            await db.insert(entregasHistorico).values({
                entregaId: id,
                acao: "STATUS_ALTERADO",
                descricao: `Status alterado de "${oldStatus}" para "${values.status}"`,
                usuario: "Usuário",
                createdAt: new Date(),
            });
        }
    } else {
        result = await db
            .insert(entregasAsBuilt)
            .values({
                ...values,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (result && result.length > 0) {
            await db.insert(entregasHistorico).values({
                entregaId: result[0].id,
                acao: "CRIADO",
                descricao: `Entrega criada: ${values.nomeDocumento}`,
                usuario: "Usuário",
                createdAt: new Date(),
            });
        }
    }

    if (comentario && id) {
        await db.insert(entregasHistorico).values({
            entregaId: id,
            acao: "COMENTARIO",
            descricao: comentario,
            usuario: "Usuário",
            createdAt: new Date(),
        });
    }

    return result;
}

export async function createBatchEntregas(data: {
    projectId: string;
    identificadorEntrega: string;
    dataRecebimento: any;
    empresaResponsavel: string;
    status: string;
    edificacaoPadrao?: string;
    disciplinaPadrao?: string;
    descricao?: string | null;
    documentos: Array<{
        nomeDocumento: string;
        formato?: string;
        edificacao?: string;
        disciplina?: string;
        escopoId?: number | null;
        modeloBaseReferencia?: string | null;
    }>;
}) {
    const db = await getDb();
    if (!db) return [];

    const normalizeDate = (d: any) => {
        if (!d) return new Date();
        if (typeof d === "string") return new Date(d + "T12:00:00");
        return d;
    };

    const dataRec = normalizeDate(data.dataRecebimento);

    const current = await db
        .select({ numeroEntrega: entregasAsBuilt.numeroEntrega })
        .from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.projectId, data.projectId));

    let nextNum = current.reduce((max, c) => Math.max(max, c.numeroEntrega || 0), 0);

    const insertedRows = [];

    for (const doc of data.documentos) {
        if (!doc.nomeDocumento || !doc.nomeDocumento.trim()) continue;

        nextNum++;
        const formato = doc.formato || "rvt";
        const isModelo = formato === "rvt" || formato === "ifc" ? 1 : 0;
        const tipoDoc =
            formato === "rvt" || formato === "ifc"
                ? "rvt"
                : formato === "dwg"
                ? "dwg"
                : "relatorio";
        const edificacao = doc.edificacao || data.edificacaoPadrao || "Geral";
        const disciplina = doc.disciplina || data.disciplinaPadrao || "Coordenação Geral";

        const [newRow] = await db
            .insert(entregasAsBuilt)
            .values({
                projectId: data.projectId,
                numeroEntrega: nextNum,
                identificadorEntrega: data.identificadorEntrega,
                nomeDocumento: doc.nomeDocumento.trim(),
                formato,
                tipoDocumento: tipoDoc,
                isModelo,
                edificacao,
                disciplina,
                empresaResponsavel: data.empresaResponsavel,
                dataRecebimento: dataRec,
                dataPrevista: dataRec,
                status: data.status || "COM_PENDENCIAS",
                escopoId: doc.escopoId || null,
                modeloBaseReferencia: doc.modeloBaseReferencia || null,
                descricao: data.descricao || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (newRow) {
            insertedRows.push(newRow);
            await db.insert(entregasHistorico).values({
                entregaId: newRow.id,
                acao: "CRIADO",
                descricao: `Documento incluído no pacote ${data.identificadorEntrega}`,
                usuario: "Usuário",
                createdAt: new Date(),
            });
        }
    }

    return insertedRows;
}

export async function deleteEntrega(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    await db.delete(entregasAsBuilt).where(eq(entregasAsBuilt.id, id));
    return true;
}

export async function getEntregasStats(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    await ensureEscopoColumns(db);

    const escConditions = [eq(escopoAsBuilt.projectId, projectId)];
    if (edificacao && edificacao !== "Todas") {
        escConditions.push(eq(escopoAsBuilt.edificacao, edificacao));
    }
    const escopos = await db.select().from(escopoAsBuilt).where(and(...escConditions));

    const entConditions = [eq(entregasAsBuilt.projectId, projectId)];
    if (edificacao && edificacao !== "Todas") {
        entConditions.push(eq(entregasAsBuilt.edificacao, edificacao));
    }
    const entregas = await db.select().from(entregasAsBuilt).where(and(...entConditions));

    let modelosValidados = 0;
    let modelosComPendencias = 0;
    let modelosIgualProjeto = 0;
    let modelosNaoEntregues = 0;
    let totalPranchas = 0;
    let pranchasValidadas = 0;

    escopos.forEach((escopo: any) => {
        const matched = entregas.filter(
            (e: any) =>
                (e.escopoId && e.escopoId === escopo.id) ||
                (e.disciplina?.toLowerCase() === escopo.disciplina?.toLowerCase() &&
                    e.edificacao?.toLowerCase() === escopo.edificacao?.toLowerCase() &&
                    e.empresaResponsavel?.toLowerCase() === escopo.empresa?.toLowerCase())
        );

        const st = resolveEscopoAuditStatus(escopo, matched);
        if (st === "VALIDADO") modelosValidados++;
        else if (st === "IGUAL_PROJETO") modelosIgualProjeto++;
        else if (st === "COM_PENDENCIAS") modelosComPendencias++;
        else modelosNaoEntregues++;

        const tp =
            escopo.totalPranchas && escopo.totalPranchas > 0
                ? escopo.totalPranchas
                : inferSteclaPranchas(escopo.edificacao, escopo.disciplina);
        totalPranchas += tp;
        pranchasValidadas += escopo.pranchasValidadas ?? 0;
    });

    const pacotesUnicos = new Set(entregas.map((e: any) => e.identificadorEntrega).filter(Boolean));

    return {
        total: escopos.length,
        aguardando: modelosNaoEntregues,
        recebidos: entregas.length,
        emRevisao: modelosComPendencias,
        validados: modelosValidados,
        igualProjeto: modelosIgualProjeto,
        validadosParcial: 0,
        validadosRessalva: 0,
        rejeitados: modelosIgualProjeto,
        atrasados: 0,
        totalPranchas,
        pranchasValidadas,
        totalPacotes: pacotesUnicos.size,
    };
}

export async function registrarVerificacao(data: {
    id: number;
    resultado: string;
    apontamentosVerificacao?: string | null;
}) {
    const db = await getDb();
    if (!db) return null;

    const newStatus = data.resultado === "CONFORME" ? "VALIDADO" : "REJEITADO";

    const result = await db
        .update(entregasAsBuilt)
        .set({
            resultado: data.resultado,
            dataVerificacao: new Date(),
            apontamentosVerificacao: data.apontamentosVerificacao || null,
            status: newStatus,
            updatedAt: new Date(),
        })
        .where(eq(entregasAsBuilt.id, data.id))
        .returning();

    if (result && result.length > 0) {
        await db.insert(entregasHistorico).values({
            entregaId: data.id,
            acao: "STATUS_ALTERADO",
            descricao: `Verificação: ${data.resultado}${
                data.apontamentosVerificacao ? " — " + data.apontamentosVerificacao : ""
            }`,
            usuario: "Usuário",
            createdAt: new Date(),
        });
    }

    return result;
}

export async function getAsBuiltStatus(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    await ensureEscopoColumns(db);

    let escopoQuery = db.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.projectId, projectId));
    if (edificacao) {
        escopoQuery = db
            .select()
            .from(escopoAsBuilt)
            .where(
                and(
                    eq(escopoAsBuilt.projectId, projectId),
                    sql`${escopoAsBuilt.edificacao} ILIKE ${"%" + edificacao + "%"}`
                )
            ) as any;
    }
    const escopos = await escopoQuery;

    const { entregasMap, allEntregas } = await getEntregasPorEscopo(projectId, edificacao);

    const totalModelos = escopos.length;
    const projectModelsUnique = new Set(escopos.map((e: any) => e.nomeModelo).filter(Boolean));
    const asBuiltModelsUnique = new Set(escopos.map((e: any) => e.nomeModeloFinal).filter(Boolean));

    const result = {
        totalModelos,
        projectModels: projectModelsUnique.size,
        asBuiltModels: asBuiltModelsUnique.size || totalModelos,
        consolidationFactor:
            projectModelsUnique.size > 0 ? (totalModelos / projectModelsUnique.size).toFixed(1) : "1.0",
        totalArquivos: allEntregas.length,
        modelosComEntrega: 0,
        comRvt: 0,
        semRvt: 0,
        modelosValidados: 0,
        modelosRecebidos: 0,
        modelosPendentes: 0,
        taxaAprovacao: 0,
        statsPorDisciplina: [] as any[],
        statsPorEmpresa: [] as any[],
        timelineRecebimento: [] as any[],
    };

    const timelineMap = new Map<string, number>();
    const sortedEntregas = allEntregas
        .filter((e: any) => e.dataRecebimento)
        .sort((a: any, b: any) => new Date(a.dataRecebimento).getTime() - new Date(b.dataRecebimento).getTime());

    if (sortedEntregas.length > 0) {
        const firstDate = new Date(sortedEntregas[0].dataRecebimento);
        const refDate = startOfWeek(firstDate);

        sortedEntregas.forEach((e: any) => {
            const date = new Date(e.dataRecebimento);
            const weeksElapsed = differenceInCalendarWeeks(date, refDate);
            const biWeekNum = Math.floor(weeksElapsed / 2);

            const periodStart = addWeeks(refDate, biWeekNum * 2);
            const key = format(periodStart, "dd/MM");
            timelineMap.set(key, (timelineMap.get(key) || 0) + 1);
        });
    }

    result.timelineRecebimento = Array.from(timelineMap.entries()).map(([mes, count]) => ({
        mes,
        count,
    }));

    const entregasComResultado = allEntregas.filter(
        (e: any) => e.status === "VALIDADO" || e.status === "EM_REVISAO"
    );
    const entregasConformes = allEntregas.filter((e: any) => e.status === "VALIDADO");
    result.taxaAprovacao =
        entregasComResultado.length > 0
            ? (entregasConformes.length / entregasComResultado.length) * 100
            : 0;

    const disciplinaMap = new Map<string, { validado: number; recebido: number; pendente: number }>();
    const empresaMap = new Map<string, { total: number; concluido: number }>();

    escopos.forEach((escopo: any) => {
        const entregas = entregasMap.get(escopo.id) || [];
        const st = resolveEscopoAuditStatus(escopo, entregas);
        const hasValidado = st === "VALIDADO";
        const hasEntrega = entregas.length > 0 || st !== "NAO_ENTREGUE";
        const hasEmAndamento = hasEntrega && !hasValidado;

        if (hasEntrega) result.modelosComEntrega++;

        if (hasValidado) {
            result.modelosValidados++;
        } else if (hasEmAndamento) {
            result.modelosRecebidos++;
        } else {
            result.modelosPendentes++;
        }

        if (escopo.temRvtOriginal === 1) {
            result.comRvt++;
        } else {
            result.semRvt++;
        }

        let disc = (escopo.disciplina || "Geral").trim();
        if (disc === "Média Tensão e Barramento") disc = "Média Tensão e Barramentos";

        if (!disciplinaMap.has(disc))
            disciplinaMap.set(disc, { validado: 0, recebido: 0, pendente: 0 });
        const dStats = disciplinaMap.get(disc)!;
        if (hasValidado) dStats.validado++;
        else if (hasEmAndamento) dStats.recebido++;
        else dStats.pendente++;

        const emp = escopo.empresa || "Outros";
        if (!empresaMap.has(emp)) empresaMap.set(emp, { total: 0, concluido: 0 });
        const eStats = empresaMap.get(emp)!;
        eStats.total++;
        if (hasValidado) eStats.concluido++;
    });

    result.statsPorDisciplina = Array.from(disciplinaMap.entries())
        .map(([name, stats]) => ({
            name,
            ...stats,
            total: stats.validado + stats.recebido + stats.pendente,
        }))
        .sort((a, b) => b.total - a.total);

    result.statsPorEmpresa = Array.from(empresaMap.entries())
        .map(([name, stats]) => ({
            name,
            total: stats.total,
            concluido: stats.concluido,
            percent: stats.total > 0 ? (stats.concluido / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.percent - a.percent);

    return {
        ...result,
        percentualCobertura:
            result.totalModelos > 0 ? (result.modelosValidados / result.totalModelos) * 100 : 0,
        percentualEntregasIniciadas:
            result.totalModelos > 0 ? (result.modelosComEntrega / result.totalModelos) * 100 : 0,
    };
}

async function getEntregasPorEscopo(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return { entregasMap: new Map(), allEntregas: [] };

    let q = db
        .select({ entregasAsBuilt })
        .from(entregasAsBuilt)
        .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
        .where(eq(escopoAsBuilt.projectId, projectId));

    if (edificacao) {
        q = db
            .select({ entregasAsBuilt })
            .from(entregasAsBuilt)
            .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
            .where(
                and(
                    eq(escopoAsBuilt.projectId, projectId),
                    sql`${entregasAsBuilt.edificacao} ILIKE ${"%" + edificacao + "%"}`
                )
            ) as any;
    }
    const raw = await q;
    const allEntregas = raw.map((r: any) => r.entregasAsBuilt);

    const entregasMap = new Map<number, any[]>();
    allEntregas.forEach((e: any) => {
        const id = e.escopoId;
        if (id) {
            if (!entregasMap.has(id)) entregasMap.set(id, []);
            entregasMap.get(id)?.push(e);
        }
    });

    return { entregasMap, allEntregas };
}
