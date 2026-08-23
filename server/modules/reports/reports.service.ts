import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";
import { getDb, relatoriosDivergencia, apontamentos, salas } from "../../common/db";

export * from "./reportGenerator";

export async function getHistoricoRelatorios(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(relatoriosDivergencia)
        .where(eq(relatoriosDivergencia.projectId, projectId))
        .orderBy(desc(relatoriosDivergencia.createdAt));
}

export async function registrarRelatorioDivergencia(projectId: string, data: any) {
    const db = await getDb();
    if (!db) return null;

    const result = await db
        .insert(relatoriosDivergencia)
        .values({
            ...data,
            projectId,
            createdAt: new Date(),
        })
        .returning();

    return result[0];
}

export async function markApontamentosAsSentByFilters(
    projectId: string,
    filters: {
        edificacao?: string;
        pavimento?: string;
        startDate?: string;
        endDate?: string;
        apenasNaoEnviados?: boolean;
        disciplina?: string;
        responsavel?: string;
        sala?: string;
    }
) {
    const db = await getDb();
    if (!db) return { success: false, count: 0 };

    const conditions: any[] = [eq(apontamentos.projectId, projectId)];
    if (filters.edificacao && filters.edificacao !== "Todas")
        conditions.push(eq(apontamentos.edificacao, filters.edificacao));
    if (filters.pavimento && filters.pavimento !== "Todos")
        conditions.push(eq(apontamentos.pavimento, filters.pavimento));
    if (filters.startDate) conditions.push(gte(apontamentos.data, new Date(filters.startDate)));
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(apontamentos.data, end));
    }
    if (filters.apenasNaoEnviados) conditions.push(eq(apontamentos.enviado, 0));

    const rows = await db
        .select({ id: apontamentos.id })
        .from(apontamentos)
        .where(and(...conditions));

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return { success: true, count: 0 };

    await db
        .update(apontamentos)
        .set({
            enviado: 1,
            dataEnvio: new Date(),
            updatedAt: new Date(),
        })
        .where(inArray(apontamentos.id, ids));

    await registrarRelatorioDivergencia(projectId, {
        titulo: `Relatório CQ - ${new Date().toLocaleDateString("pt-BR")}`,
        periodoInicio: filters.startDate ? new Date(filters.startDate) : null,
        periodoFim: filters.endDate ? new Date(filters.endDate) : null,
        disciplina: filters.disciplina !== "Todas" ? filters.disciplina : null,
        quantidadeItens: ids.length,
        geradoPor: "Sistema",
        status: "ENVIADO",
    });

    return { success: true, count: ids.length };
}
