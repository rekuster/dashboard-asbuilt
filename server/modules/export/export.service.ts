import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb, projects } from "../../common/db";
import {
    getKPIs,
    getKPIsPorEdificacao,
    getApontamentosPorSemana,
    getApontamentosPorDisciplina,
    getStatsStatus,
    getTopSalasImpactadas,
    getAsBuiltModelsSummary,
} from "../analytics/analytics.service";
import { getEdificacoes } from "../rooms/rooms.service";

export interface StoredExportToken {
    id: string;
    name: string;
    tokenPrefix: string;
    tokenHash: string;
    createdBy: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
}

export interface PublicExportTokenInfo {
    id: string;
    name: string;
    tokenPrefix: string;
    createdBy: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
}

function hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

function parseProjectConfig(rawConfig: string | null | undefined): Record<string, any> {
    if (!rawConfig) return {};
    try {
        const parsed = JSON.parse(rawConfig);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
        if (Array.isArray(parsed)) {
            return { _items: parsed };
        }
    } catch {
        // Ignore invalid JSON
    }
    return {};
}

export async function listExportTokens(projectId: string): Promise<PublicExportTokenInfo[]> {
    const db = await getDb();
    if (!db) return [];

    const [proj] = await db
        .select({ companiesConfig: projects.companiesConfig })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    const cfg = parseProjectConfig(proj?.companiesConfig);
    const tokens: StoredExportToken[] = Array.isArray(cfg._exportTokens) ? cfg._exportTokens : [];

    return tokens
        .filter((t) => !t.revokedAt)
        .map(({ tokenHash, ...rest }) => rest)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createExportToken(
    projectId: string,
    name: string,
    createdBy: string
): Promise<{ token: string; record: PublicExportTokenInfo }> {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    const [proj] = await db
        .select({ companiesConfig: projects.companiesConfig })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (!proj) throw new Error("Projeto não encontrado");

    const cfg = parseProjectConfig(proj.companiesConfig);
    const tokens: StoredExportToken[] = Array.isArray(cfg._exportTokens) ? cfg._exportTokens : [];

    const randomHex = crypto.randomBytes(24).toString("hex");
    const rawToken = `stcl_exp_${randomHex}`;
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = `${rawToken.slice(0, 15)}...`;

    const newRecord: StoredExportToken = {
        id: crypto.randomUUID(),
        name: name.trim() || "Suplemento PowerPoint",
        tokenPrefix,
        tokenHash,
        createdBy: createdBy || "Stecla",
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        revokedAt: null,
    };

    cfg._exportTokens = [...tokens, newRecord];

    await db
        .update(projects)
        .set({
            companiesConfig: JSON.stringify(cfg),
            updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

    const { tokenHash: _hidden, ...publicRecord } = newRecord;
    return {
        token: rawToken,
        record: publicRecord,
    };
}

export async function revokeExportToken(projectId: string, tokenId: string): Promise<{ success: boolean }> {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    const [proj] = await db
        .select({ companiesConfig: projects.companiesConfig })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (!proj) throw new Error("Projeto não encontrado");

    const cfg = parseProjectConfig(proj.companiesConfig);
    const tokens: StoredExportToken[] = Array.isArray(cfg._exportTokens) ? cfg._exportTokens : [];

    cfg._exportTokens = tokens.map((t) =>
        t.id === tokenId ? { ...t, revokedAt: new Date().toISOString() } : t
    );

    await db
        .update(projects)
        .set({
            companiesConfig: JSON.stringify(cfg),
            updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

    return { success: true };
}

export async function verifyExportToken(
    rawToken: string,
    expectedProjectId?: string
): Promise<{
    valid: boolean;
    projectId?: string;
    tokenId?: string;
    tokenName?: string;
    createdBy?: string;
}> {
    if (!rawToken || !rawToken.startsWith("stcl_exp_")) {
        return { valid: false };
    }

    const db = await getDb();
    if (!db) return { valid: false };

    const incomingHash = hashToken(rawToken);
    const incomingBuf = Buffer.from(incomingHash, "hex");

    const rows = expectedProjectId
        ? await db
              .select({ id: projects.id, companiesConfig: projects.companiesConfig })
              .from(projects)
              .where(eq(projects.id, expectedProjectId))
        : await db.select({ id: projects.id, companiesConfig: projects.companiesConfig }).from(projects);

    for (const row of rows) {
        const cfg = parseProjectConfig(row.companiesConfig);
        const tokens: StoredExportToken[] = Array.isArray(cfg._exportTokens) ? cfg._exportTokens : [];

        for (const t of tokens) {
            if (t.revokedAt || !t.tokenHash) continue;
            const storedBuf = Buffer.from(t.tokenHash, "hex");
            if (
                storedBuf.length === incomingBuf.length &&
                crypto.timingSafeEqual(storedBuf, incomingBuf)
            ) {
                // Update lastUsedAt non-blocking
                t.lastUsedAt = new Date().toISOString();
                db.update(projects)
                    .set({ companiesConfig: JSON.stringify(cfg) })
                    .where(eq(projects.id, row.id))
                    .catch(() => {});

                return {
                    valid: true,
                    projectId: row.id,
                    tokenId: t.id,
                    tokenName: t.name,
                    createdBy: t.createdBy,
                };
            }
        }
    }

    return { valid: false };
}

function round1(val: number | undefined | null): number {
    if (!val || Number.isNaN(val)) return 0;
    return Number(Number(val).toFixed(1));
}

function format1(val: number | undefined | null): string {
    return round1(val).toFixed(1);
}

/**
 * Generates the complete payload for the PowerPoint add-in (`GET /api/export/v1/projects/:id/slide`),
 * including:
 * 1. Slide "BIM – Realidade Aumentada" (KPIs Gerais + Por Edificação + Dados e URLs dos Gráficos)
 * 2. Slide "As-Built • Status dos Modelos 3D & Documentação 2D" (Por Contratada: Thá, Ocle, AeB, Todas)
 */
export async function buildSlideExportPayload(
    projectId: string,
    baseUrl: string,
    rawExportToken?: string
) {
    const db = await getDb();
    let projectName = "Obra";
    let projectCode = "";
    if (db) {
        const [proj] = await db
            .select({ name: projects.name, code: projects.code })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);
        if (proj) {
            projectName = proj.name;
            projectCode = proj.code;
        }
    }

    const tokenQuery = rawExportToken ? `token=${encodeURIComponent(rawExportToken)}` : "";
    const makeUrl = (path: string, extraQuery?: Record<string, string>) => {
        const params = new URLSearchParams();
        if (extraQuery) {
            for (const [k, v] of Object.entries(extraQuery)) {
                if (v) params.set(k, v);
            }
        }
        if (rawExportToken) {
            params.set("token", rawExportToken);
        }
        const qs = params.toString();
        return `${baseUrl}${path}${qs ? `?${qs}` : ""}`;
    };

    const [
        edificacoes,
        globalKpis,
        semanaGeral,
        disciplinaGeral,
        statusGeral,
        topSalasGeral,
        asBuiltTha,
        asBuiltOcle,
        asBuiltAeB,
        asBuiltTodas,
    ] = await Promise.all([
        getEdificacoes(projectId),
        getKPIs(projectId),
        getApontamentosPorSemana(projectId),
        getApontamentosPorDisciplina(projectId),
        getStatsStatus(projectId),
        getTopSalasImpactadas(projectId),
        getAsBuiltModelsSummary(projectId, "Thá"),
        getAsBuiltModelsSummary(projectId, "Ocle"),
        getAsBuiltModelsSummary(projectId, "AeB"),
        getAsBuiltModelsSummary(projectId, "Todas"),
    ]);

    const porEdificacao = await Promise.all(
        edificacoes.map(async (edificacao) => {
            const kpi = await getKPIsPorEdificacao(projectId, edificacao);
            return {
                edificacao,
                totalSalas: kpi?.totalSalas ?? 0,
                salasLiberadas: kpi?.salasLiberadas ?? 0,
                taxaLiberacao: round1(kpi?.taxaLiberacao),
                taxaLiberacaoFormatada: `${format1(kpi?.taxaLiberacao)}%`,
                salasVerificadas: kpi?.salasVerificadas ?? 0,
                taxaVerificacao: round1(kpi?.taxaVerificacao),
                taxaVerificacaoFormatada: `${format1(kpi?.taxaVerificacao)}%`,
                totalApontamentos: kpi?.totalApontamentos ?? 0,
                mediaApontamentos: round1(kpi?.mediaApontamentos),
                mediaApontamentosFormatada: format1(kpi?.mediaApontamentos),
                salasComForro: kpi?.salasComForro ?? 0,
                salasVerificadasComForro: kpi?.salasVerificadasComForro ?? 0,
                percentualForroVerificadas: round1(kpi?.percentualForroVerificadas),
                percentualForroVerificadasFormatado: `${format1(kpi?.percentualForroVerificadas)}%`,
                exportUrls: {
                    semana: makeUrl(`/export/${projectId}/grafico/semana`, { edificacao }),
                    disciplina: makeUrl(`/export/${projectId}/grafico/disciplina`, { edificacao }),
                },
            };
        })
    );

    const formatEmpresaSummary = (empKey: string, summary: any) => ({
        ...summary,
        exportUrls: {
            graficoEdificacoes: makeUrl(`/export/${projectId}/grafico/asbuilt-edificacoes`, {
                empresa: empKey,
            }),
            painelCompleto: makeUrl(`/export/${projectId}/grafico/asbuilt-painel`, {
                empresa: empKey,
            }),
        },
    });

    return {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        project: {
            id: projectId,
            code: projectCode,
            name: projectName,
        },
        edificacoes,
        geral: {
            totalSalas: globalKpis?.totalSalas ?? 0,
            salasLiberadas: globalKpis?.salasLiberadas ?? 0,
            taxaLiberacao: round1(globalKpis?.taxaLiberacao),
            taxaLiberacaoFormatada: `${format1(globalKpis?.taxaLiberacao)}%`,
            salasVerificadas: globalKpis?.salasVerificadas ?? 0,
            taxaVerificacao: round1(globalKpis?.taxaVerificacao),
            taxaVerificacaoFormatada: `${format1(globalKpis?.taxaVerificacao)}%`,
            totalApontamentos: globalKpis?.totalApontamentos ?? 0,
            mediaApontamentos: round1(globalKpis?.mediaApontamentos),
            mediaApontamentosFormatada: format1(globalKpis?.mediaApontamentos),
            salasComForro: globalKpis?.salasComForro ?? 0,
            salasVerificadasComForro: globalKpis?.salasVerificadasComForro ?? 0,
            percentualForroVerificadas: round1(globalKpis?.percentualForroVerificadas),
            percentualForroVerificadasFormatado: `${format1(globalKpis?.percentualForroVerificadas)}%`,
        },
        porEdificacao,
        graficos: {
            apontamentosPorSemana: semanaGeral,
            apontamentosPorDisciplina: disciplinaGeral,
            statusSalas: statusGeral,
            topSalasImpactadas: topSalasGeral,
        },
        asBuiltModelos: {
            porEmpresa: {
                "Thá": formatEmpresaSummary("Thá", asBuiltTha),
                Ocle: formatEmpresaSummary("Ocle", asBuiltOcle),
                AeB: formatEmpresaSummary("AeB", asBuiltAeB),
                Todas: formatEmpresaSummary("Todas", asBuiltTodas),
            },
        },
        exportUrls: {
            semana: makeUrl(`/export/${projectId}/grafico/semana`),
            disciplina: makeUrl(`/export/${projectId}/grafico/disciplina`),
            asBuiltEdificacoesTha: makeUrl(`/export/${projectId}/grafico/asbuilt-edificacoes`, {
                empresa: "Thá",
            }),
            asBuiltEdificacoesOcle: makeUrl(`/export/${projectId}/grafico/asbuilt-edificacoes`, {
                empresa: "Ocle",
            }),
            asBuiltEdificacoesAeB: makeUrl(`/export/${projectId}/grafico/asbuilt-edificacoes`, {
                empresa: "AeB",
            }),
            asBuiltPainelTha: makeUrl(`/export/${projectId}/grafico/asbuilt-painel`, {
                empresa: "Thá",
            }),
            asBuiltPainelOcle: makeUrl(`/export/${projectId}/grafico/asbuilt-painel`, {
                empresa: "Ocle",
            }),
            asBuiltPainelAeB: makeUrl(`/export/${projectId}/grafico/asbuilt-painel`, {
                empresa: "AeB",
            }),
        },
    };
}
