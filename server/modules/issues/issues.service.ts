import { eq, and, sql, desc, like, inArray, gte, lte } from "drizzle-orm";
import { getDb, apontamentos, salas, bcfFiles, type Apontamento, type InsertApontamento } from "../../common/db";

export async function getAllApontamentos(projectId: string): Promise<Apontamento[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
        .select({
            id: apontamentos.id,
            projectId: apontamentos.projectId,
            numeroApontamento: apontamentos.numeroApontamento,
            data: apontamentos.data,
            edificacao: apontamentos.edificacao,
            pavimento: apontamentos.pavimento,
            setor: apontamentos.setor,
            sala: apontamentos.sala,
            disciplina: apontamentos.disciplina,
            divergencia: apontamentos.divergencia,
            status: apontamentos.status,
            prioridade: apontamentos.prioridade,
            tipo: apontamentos.tipo,
            comentario: apontamentos.comentario,
            dataResolvido: apontamentos.dataResolvido,
            responsavel: apontamentos.responsavel,
            dataEnvio: apontamentos.dataEnvio,
            enviado: apontamentos.enviado,
            asBuiltPrintUrl: sql<string | null>`CASE WHEN ${apontamentos.asBuiltPrintUrl} LIKE 'http%' THEN ${apontamentos.asBuiltPrintUrl} WHEN length(coalesce(${apontamentos.asBuiltPrintUrl}, '')) < 1000 THEN ${apontamentos.asBuiltPrintUrl} ELSE NULL END`,
            bcfIssueId: apontamentos.bcfIssueId,
            fotoUrl: sql<string | null>`CASE WHEN ${apontamentos.fotoUrl} LIKE 'http%' THEN ${apontamentos.fotoUrl} WHEN length(coalesce(${apontamentos.fotoUrl}, '')) < 1000 THEN ${apontamentos.fotoUrl} ELSE NULL END`,
            fotoReferenciaUrl: sql<string | null>`CASE WHEN ${apontamentos.fotoReferenciaUrl} LIKE 'http%' THEN ${apontamentos.fotoReferenciaUrl} WHEN length(coalesce(${apontamentos.fotoReferenciaUrl}, '')) < 1000 THEN ${apontamentos.fotoReferenciaUrl} ELSE NULL END`,
            hasFoto: sql<boolean>`(${apontamentos.fotoUrl} IS NOT NULL AND length(${apontamentos.fotoUrl}) > 0)`,
            hasFotoRef: sql<boolean>`(${apontamentos.fotoReferenciaUrl} IS NOT NULL AND length(${apontamentos.fotoReferenciaUrl}) > 0)`,
            createdAt: apontamentos.createdAt,
            updatedAt: apontamentos.updatedAt,
        })
        .from(apontamentos)
        .where(eq(apontamentos.projectId, projectId))
        .orderBy(desc(apontamentos.numeroApontamento));

    return rows as any;
}

export async function getApontamentoById(id: number): Promise<Apontamento | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(apontamentos).where(eq(apontamentos.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function getApontamentosBySala(projectId: string, nomeSala: string): Promise<Apontamento[]> {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(apontamentos)
        .where(
            and(
                eq(apontamentos.projectId, projectId),
                like(apontamentos.sala, `%${nomeSala.trim()}%`)
            )
        )
        .orderBy(apontamentos.numeroApontamento);
}

export async function createApontamento(data: InsertApontamento) {
    const db = await getDb();
    if (!db) return null;

    const dataVerificacao = typeof data.data === "string" ? new Date(data.data) : data.data;

    const nextNumSubquery = data.projectId
        ? sql`(SELECT COALESCE(MAX(${apontamentos.numeroApontamento}), 0) + 1 FROM ${apontamentos} WHERE ${apontamentos.projectId} = ${data.projectId})`
        : sql`(SELECT COALESCE(MAX(${apontamentos.numeroApontamento}), 0) + 1 FROM ${apontamentos})`;

    const result = await db
        .insert(apontamentos)
        .values({
            ...data,
            data: dataVerificacao,
            numeroApontamento: nextNumSubquery as any,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    // Auto-update room status & verification date
    try {
        const salaAlvo = await db
            .select()
            .from(salas)
            .where(
                and(
                    eq(salas.nome, data.sala),
                    eq(salas.edificacao, data.edificacao),
                    eq(salas.pavimento, data.pavimento)
                )
            )
            .limit(1);

        if (salaAlvo.length > 0) {
            const sala = salaAlvo[0];
            const deveAtualizar = !sala.dataVerificada || dataVerificacao > sala.dataVerificada;

            if (deveAtualizar) {
                await db
                    .update(salas)
                    .set({
                        dataVerificada: dataVerificacao,
                        status: "VERIFICADA",
                        updatedAt: new Date(),
                    })
                    .where(eq(salas.id, sala.id));
            }
        }
    } catch (syncError) {
        console.warn("[createApontamento] Warning during room date sync:", syncError);
    }

    return result[0];
}

export async function updateApontamento(id: number, data: Partial<Apontamento>) {
    const db = await getDb();
    if (!db) return null;

    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.dataResolvido && typeof data.dataResolvido === "string") {
        updateData.dataResolvido = new Date(data.dataResolvido);
    }

    const result = await db
        .update(apontamentos)
        .set(updateData)
        .where(eq(apontamentos.id, id))
        .returning();

    return result[0];
}

export async function deleteApontamento(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const [target] = await db.select().from(apontamentos).where(eq(apontamentos.id, id)).limit(1);
    if (!target) return false;

    const { numeroApontamento: deletedNum, projectId } = target;

    await db.delete(apontamentos).where(eq(apontamentos.id, id));

    // Renumber subsequent issues atomically
    if (projectId) {
        await db
            .update(apontamentos)
            .set({
                numeroApontamento: sql`${apontamentos.numeroApontamento} - 1`,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(apontamentos.projectId, projectId),
                    sql`${apontamentos.numeroApontamento} > ${deletedNum}`
                )
            );
    } else {
        await db
            .update(apontamentos)
            .set({
                numeroApontamento: sql`${apontamentos.numeroApontamento} - 1`,
                updatedAt: new Date(),
            })
            .where(sql`${apontamentos.numeroApontamento} > ${deletedNum}`);
    }

    return true;
}

export async function updateApontamentoAsBuilt(
    id: number,
    asBuiltNota: string | null,
    asBuiltPrintUrl: string | null,
    bcfIssueId: string | null,
    status?: string
) {
    const db = await getDb();
    if (!db) return null;

    const dataToUpdate: any = {
        asBuiltNota: asBuiltNota || null,
        asBuiltPrintUrl: asBuiltPrintUrl || null,
        bcfIssueId: bcfIssueId || null,
        updatedAt: new Date(),
    };

    if (status) {
        dataToUpdate.status = status;
        if (status === "RESOLVIDA") {
            dataToUpdate.dataResolvido = new Date();
        }
    }

    const result = await db
        .update(apontamentos)
        .set(dataToUpdate)
        .where(eq(apontamentos.id, id))
        .returning();

    return result[0];
}

export async function markApontamentosAsSent(ids: number[]) {
    const db = await getDb();
    if (!db || ids.length === 0) return { success: false };

    await db
        .update(apontamentos)
        .set({
            enviado: 1,
            dataEnvio: new Date(),
            updatedAt: new Date(),
        })
        .where(inArray(apontamentos.id, ids));

    return { success: true };
}

export async function saveBcfFile(data: {
    projectId: string;
    disciplina: string;
    edificacao: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedBy?: string;
}) {
    const db = await getDb();
    if (!db) return null;
    const res = await db.insert(bcfFiles).values(data as any).returning();
    return res[0];
}

export async function getBcfFiles(projectId: string, disciplina?: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];
    const conditions: any[] = [eq(bcfFiles.projectId, projectId as any)];
    if (disciplina) conditions.push(eq(bcfFiles.disciplina, disciplina));
    if (edificacao && edificacao !== "todas" && edificacao !== "TODAS") {
        conditions.push(eq(bcfFiles.edificacao, edificacao));
    }
    return await db.select().from(bcfFiles).where(and(...conditions)).orderBy(desc(bcfFiles.createdAt));
}

export interface BcfTopicInput {
    index: number | string;
    title: string;
    description?: string;
    topicStatus?: string;
    author?: string;
    creationDate?: string;
    snapshotUrl?: string;
    comments?: Array<{
        author?: string;
        date?: string;
        text?: string;
        status?: string;
    }>;
}

export async function syncBcfIssues(
    projectId: string,
    disciplina: string,
    edificacao: string,
    isPartnerReturn: boolean,
    topics: BcfTopicInput[]
) {
    const db = await getDb();
    if (!db || topics.length === 0) return { updatedCount: 0, totalTopics: 0 };

    // Busca todos os apontamentos desta disciplina e edificação
    const rows = await db
        .select()
        .from(apontamentos)
        .where(
            and(
                eq(apontamentos.projectId, projectId as any),
                eq(apontamentos.disciplina, disciplina),
                eq(apontamentos.edificacao, edificacao)
            )
        )
        .orderBy(apontamentos.numeroApontamento);

    let updatedCount = 0;

    for (const topic of topics) {
        const topicIndexNum = parseInt(String(topic.index), 10);
        const topicTitleClean = (topic.title || "").trim().toLowerCase();

        // 1. Tenta encontrar por bcfIssueId ou numeroApontamento
        let match = rows.find(
            (r) =>
                r.bcfIssueId === String(topic.index) ||
                r.numeroApontamento === topicIndexNum
        );

        // 2. Se não encontrou pelo índice, tenta pelo nome da sala
        if (!match && topicTitleClean) {
            match = rows.find(
                (r) => (r.sala || "").trim().toLowerCase() === topicTitleClean
            );
        }

        if (match) {
            const dataToUpdate: any = {
                bcfIssueId: String(topic.index),
                updatedAt: new Date(),
            };

            if (topic.snapshotUrl) {
                dataToUpdate.asBuiltPrintUrl = topic.snapshotUrl;
            }

            // Constrói nota técnica / histórico a partir dos comentários e descrição
            const commentTexts = (topic.comments || [])
                .filter((c) => c.text && c.text.trim().length > 0 && !c.text.includes("<Date>"))
                .map((c) => `[${c.author || "BCF"}]: ${c.text}`)
                .join("\n");

            if (commentTexts) {
                dataToUpdate.asBuiltNota = commentTexts;
            } else if (topic.description && topic.description !== "Sem descrição") {
                dataToUpdate.asBuiltNota = topic.description;
            }

            if (isPartnerReturn) {
                if (topic.topicStatus?.toLowerCase() === "resolved" && match.status !== "SANADA") {
                    dataToUpdate.status = "EM_REVISAO";
                }
            }

            await db
                .update(apontamentos)
                .set(dataToUpdate)
                .where(eq(apontamentos.id, match.id));

            updatedCount++;
        }
    }

    return { updatedCount, totalTopics: topics.length };
}


