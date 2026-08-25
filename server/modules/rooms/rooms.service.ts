import { eq, and, sql, desc, asc } from "drizzle-orm";
import { getDb, salas, verificacaoModelo, type Sala, type InsertSala } from "../../common/db";
import { calculateStatusRA, calculateRoomStatus } from "./rooms.automation";

export async function getAllSalas(projectId: string): Promise<Sala[]> {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(salas)
        .where(eq(salas.projectId, projectId))
        .orderBy(
            salas.edificacao,
            sql`COALESCE(NULLIF(regexp_replace(${salas.numeroSala}, '[^0-9]', '', 'g'), '')::integer, 0)`,
            salas.numeroSala
        );
}

export async function getSalas(projectId: string, limit?: number, offset = 0): Promise<Sala[]> {
    const db = await getDb();
    if (!db) return [];

    let query = db
        .select()
        .from(salas)
        .where(eq(salas.projectId, projectId))
        .orderBy(
            salas.edificacao,
            sql`COALESCE(NULLIF(regexp_replace(${salas.numeroSala}, '[^0-9]', '', 'g'), '')::integer, 0)`,
            salas.numeroSala
        );

    if (limit !== undefined) {
        return query.limit(limit).offset(offset) as any;
    }

    return query;
}

export async function getSalaById(id: number): Promise<Sala | null> {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(salas).where(eq(salas.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function getEdificacoes(projectId: string): Promise<string[]> {
    const db = await getDb();
    if (!db) return [];

    const result = await db
        .selectDistinct({ edificacao: salas.edificacao })
        .from(salas)
        .where(eq(salas.projectId, projectId))
        .orderBy(salas.edificacao);

    return result.map((r) => r.edificacao);
}

export async function getPavimentos(projectId: string, edificacao?: string): Promise<string[]> {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(salas.projectId, projectId)];
    if (edificacao) {
        conditions.push(eq(salas.edificacao, edificacao));
    }

    const result = await db
        .selectDistinct({ pavimento: salas.pavimento })
        .from(salas)
        .where(and(...conditions))
        .orderBy(salas.pavimento);

    return result.map((r) => r.pavimento);
}

export async function getSalasByEdificacao(projectId: string, edificacao: string): Promise<Sala[]> {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(salas)
        .where(and(eq(salas.projectId, projectId), eq(salas.edificacao, edificacao)))
        .orderBy(
            sql`COALESCE(NULLIF(regexp_replace(${salas.numeroSala}, '[^0-9]', '', 'g'), '')::integer, 0)`,
            salas.numeroSala
        );
}

export async function getSalasByEdificacaoAndPavimento(
    projectId: string,
    edificacao: string,
    pavimento: string
): Promise<Sala[]> {
    const db = await getDb();
    if (!db) return [];

    return db
        .select()
        .from(salas)
        .where(
            and(
                eq(salas.projectId, projectId),
                eq(salas.edificacao, edificacao),
                eq(salas.pavimento, pavimento)
            )
        )
        .orderBy(
            sql`COALESCE(NULLIF(regexp_replace(${salas.numeroSala}, '[^0-9]', '', 'g'), '')::integer, 0)`,
            salas.numeroSala
        );
}

export async function updateSala(
    id: number,
    data: {
        nome?: string;
        numeroSala?: string;
        edificacao?: string;
        pavimento?: string;
        setor?: string;
    }
) {
    const db = await getDb();
    if (!db) return null;

    const result = await db
        .update(salas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(salas.id, id))
        .returning();

    return result[0];
}

export async function updateSalaStatus(id: number, data: Partial<Sala>) {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    return await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(salas).where(eq(salas.id, id)).limit(1);
        if (!existing) throw new Error("Sala não encontrada");

        const updatedData = { ...existing, ...data };
        const statusRA = calculateStatusRA(updatedData);
        const status = calculateRoomStatus(updatedData);

        const result = await tx
            .update(salas)
            .set({
                ...data,
                statusRA,
                status,
                updatedAt: new Date(),
            })
            .where(eq(salas.id, id))
            .returning();

        return result[0];
    });
}

export async function deleteSala(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    await db.delete(salas).where(eq(salas.id, id));
    return true;
}

export async function saveMasterList(
    projectId: string,
    salasList: Array<{
        edificacao: string;
        pavimento: string;
        setor: string;
        nome: string;
        numeroSala: string;
    }>
) {
    const db = await getDb();
    if (!db) return { created: 0 };

    let created = 0;
    for (const sala of salasList) {
        await db.insert(salas).values({
            projectId,
            edificacao: sala.edificacao,
            pavimento: sala.pavimento,
            setor: sala.setor,
            nome: sala.nome,
            numeroSala: sala.numeroSala,
            status: "PENDENTE",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        created++;
    }

    return { created };
}

export async function renumberSalasInEdificacao(
    projectId: string,
    edificacao: string,
    fromNumber: number
): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    const roomsToShift = await db
        .select()
        .from(salas)
        .where(
            and(
                eq(salas.projectId, projectId),
                eq(salas.edificacao, edificacao),
                sql`COALESCE(NULLIF(regexp_replace(${salas.numeroSala}, '[^0-9]', '', 'g'), '')::integer, 0) >= ${fromNumber}`
            )
        )
        .orderBy(sql`COALESCE(NULLIF(regexp_replace(${salas.numeroSala}, '[^0-9]', '', 'g'), '')::integer, 0) DESC`);

    for (const room of roomsToShift) {
        const currentNum = parseInt(room.numeroSala, 10) || 0;
        await db
            .update(salas)
            .set({ numeroSala: String(currentNum + 1), updatedAt: new Date() })
            .where(eq(salas.id, room.id));
    }

    return roomsToShift.length;
}

export async function getVerificacoes(salaId: number) {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(verificacaoModelo).where(eq(verificacaoModelo.salaId, salaId));
}

export async function getAllVerificacoes(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
        .select({
            id: verificacaoModelo.id,
            salaId: verificacaoModelo.salaId,
            disciplina: verificacaoModelo.disciplina,
            status: verificacaoModelo.status,
            observacao: verificacaoModelo.observacao,
            printUrl: verificacaoModelo.printUrl,
            updatedAt: verificacaoModelo.updatedAt,
        })
        .from(verificacaoModelo)
        .innerJoin(salas, eq(verificacaoModelo.salaId, salas.id))
        .where(eq(salas.projectId, projectId));

    return rows;
}

export async function upsertVerificacao(
    salaId: number,
    disciplina: string,
    status: string,
    observacao?: string | null,
    printUrl?: string | null
) {
    const db = await getDb();
    if (!db) return null;

    const existing = await db
        .select()
        .from(verificacaoModelo)
        .where(and(eq(verificacaoModelo.salaId, salaId), eq(verificacaoModelo.disciplina, disciplina)))
        .limit(1);

    if (existing.length > 0) {
        return await db
            .update(verificacaoModelo)
            .set({
                status,
                observacao: observacao || null,
                printUrl: printUrl || null,
                updatedAt: new Date(),
            })
            .where(eq(verificacaoModelo.id, existing[0].id))
            .returning();
    } else {
        return await db
            .insert(verificacaoModelo)
            .values({
                salaId,
                disciplina,
                status,
                observacao: observacao || null,
                printUrl: printUrl || null,
                updatedAt: new Date(),
            })
            .returning();
    }
}
