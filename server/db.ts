import "dotenv/config";
import { eq, sql, desc } from "drizzle-orm";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import Database from "better-sqlite3";
import postgres from "postgres";
import * as sqliteSchema from "../drizzle/schema.ts";
import * as pgSchema from "../drizzle/schema.pg.ts";

// Re-export tables based on active dialect
const isPostgres = !!process.env.DATABASE_URL;
const activeSchema = isPostgres ? pgSchema : sqliteSchema;

export const { users, salas, apontamentos, ifcFiles, uploads, entregasAsBuilt, entregasHistorico } = activeSchema as any;
export type InsertUser = typeof sqliteSchema.users.$inferInsert;
export type InsertApontamento = typeof sqliteSchema.apontamentos.$inferInsert;
export type InsertSala = typeof sqliteSchema.salas.$inferInsert;

let _db: any = null;
let _client: any = null;

export async function getDb() {
    if (!_db) {
        try {
            if (process.env.DATABASE_URL) {
                console.log("[Database] Connecting to PostgreSQL...");
                _client = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 10 });
                _db = drizzlePg(_client, { schema: pgSchema });
            } else {
                console.log("[Database] Connecting to SQLite...");
                const sqlite = new Database("sqlite.db");
                _db = drizzleSqlite(sqlite, { schema: sqliteSchema });
            }
        } catch (error) {
            console.warn("[Database] Failed to connect:", error);
            _db = null;
        }
    }
    return _db;
}

export async function closeDb() {
    if (_client) {
        await _client.end();
        _client = null;
        _db = null;
    }
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const values: any = { ...user };
    if (!values.lastSignedIn) values.lastSignedIn = new Date();

    const existing = await getUserByOpenId(user.openId);
    if (existing) {
        await db.update(users).set(values).where(eq(users.openId, user.openId));
    } else {
        await db.insert(users).values(values);
    }
}

export async function getUserByOpenId(openId: string) {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// SALAS FUNCTIONS
// ============================================================================

export async function getAllSalas() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(salas);
}

export async function getSalaByNome(nome: string) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(salas).where(eq(salas.nome, nome)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function getSalaById(id: number) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(salas).where(eq(salas.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function linkIfcToRoom(salaId: number, ifcExpressId: number | string | null) {
    const db = await getDb();
    if (!db) return null;

    if (ifcExpressId === null) {
        return await db.update(salas).set({ ifcExpressId: null }).where(eq(salas.id, salaId));
    }

    const newId = String(ifcExpressId);

    // 1. EXCLUSIVE MAPPING: Remove this ID from ANY other room it might be in
    const allRooms = await db.select().from(salas);
    for (const r of allRooms) {
        if (r.ifcExpressId && r.id !== salaId) {
            const ids = String(r.ifcExpressId).split(',').map(s => s.trim());
            if (ids.includes(newId)) {
                const filteredIds = ids.filter(id => id !== newId);
                const newValue = filteredIds.length > 0 ? filteredIds.join(',') : null;
                await db.update(salas).set({ ifcExpressId: newValue }).where(eq(salas.id, r.id));
            }
        }
    }

    // 2. Add to target room
    const room = await db.select().from(salas).where(eq(salas.id, salaId)).limit(1);
    if (room.length === 0) return null;

    let currentIds = room[0].ifcExpressId ? String(room[0].ifcExpressId).split(',').map(s => s.trim()) : [];

    if (!currentIds.includes(newId)) {
        currentIds.push(newId);
    }

    const updatedValue = currentIds.join(',');
    return await db.update(salas).set({ ifcExpressId: updatedValue }).where(eq(salas.id, salaId));
}

export async function unlinkIfcFromRoom(salaId: number, ifcExpressId: number | string) {
    const db = await getDb();
    if (!db) return null;

    const targetId = String(ifcExpressId);
    const room = await db.select().from(salas).where(eq(salas.id, salaId)).limit(1);
    if (room.length === 0) return null;

    if (!room[0].ifcExpressId) return null;

    const ids = String(room[0].ifcExpressId).split(',').map(s => s.trim());
    const filteredIds = ids.filter(id => id !== targetId);
    const newValue = filteredIds.length > 0 ? filteredIds.join(',') : null;

    return await db.update(salas).set({ ifcExpressId: newValue }).where(eq(salas.id, salaId));
}


// ============================================================================
// APONTAMENTOS FUNCTIONS
// ============================================================================

export async function getAllApontamentos() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(apontamentos);
}

export async function getApontamentosBySala(nomeSala: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(apontamentos).where(eq(apontamentos.sala, nomeSala));
}

// ============================================================================
// KPI FUNCTIONS
// ============================================================================

export async function getKPIs(edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    let sQuery = db.select().from(salas);
    let aQuery = db.select().from(apontamentos);

    if (edificacao) {
        sQuery = sQuery.where(eq(salas.edificacao, edificacao)) as any;
        aQuery = aQuery.where(eq(apontamentos.edificacao, edificacao)) as any;
    }

    const allSalas = await sQuery;
    const allApontamentos = await aQuery;

    const totalSalas = allSalas.length;
    const totalApontamentos = allApontamentos.length;

    const salasVerificadas = allSalas.filter((s: any) => {
        const val = s.status?.trim().toUpperCase();
        return val === 'VERIFICADA' || val === 'REVISAR' || val === 'EM REVISÃO';
    }).length;

    const salasLiberadas = allSalas.filter((s: any) => {
        const val = s.statusRA?.trim().toUpperCase();
        return val && (val === 'LIBERADO PARA OBRA' || val === 'LIBERADO' || val.includes('LIBERADO'));
    }).length;

    const issuesPerRoom = new Map<string, number>();
    allApontamentos.forEach((a: any) => {
        issuesPerRoom.set(a.sala, (issuesPerRoom.get(a.sala) || 0) + 1);
    });

    let salasCriticas = 0;
    issuesPerRoom.forEach(count => { if (count > 10) salasCriticas++; });

    return {
        totalSalas,
        salasVerificadas,
        salasLiberadas,
        totalApontamentos,
        salasCriticas,
        taxaVerificacao: totalSalas > 0 ? (salasVerificadas / totalSalas) * 100 : 0,
        taxaLiberacao: totalSalas > 0 ? (salasLiberadas / totalSalas) * 100 : 0,
        taxaCriticidade: totalSalas > 0 ? (salasCriticas / totalSalas) * 100 : 0,
        mediaApontamentos: salasVerificadas > 0 ? totalApontamentos / salasVerificadas : 0,
    };
}

export async function getStatsStatus(edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    let sQuery = db.select().from(salas);
    let aQuery = db.select().from(apontamentos);

    if (edificacao) {
        sQuery = sQuery.where(eq(salas.edificacao, edificacao));
        aQuery = aQuery.where(eq(apontamentos.edificacao, edificacao));
    }

    const allRooms = await sQuery;
    const allApontamentos = await aQuery;

    const issuesPerRoom = new Map<string, number>();
    allApontamentos.forEach((a: any) => {
        issuesPerRoom.set(a.sala, (issuesPerRoom.get(a.sala) || 0) + 1);
    });

    const stats = { Verificada: 0, Revisar: 0, Pendente: 0, Critico: 0 };

    allRooms.forEach((room: any) => {
        const count = issuesPerRoom.get(room.nome) || 0;
        const status = (room.status || '').trim().toUpperCase(); // FIXED: Added trim()

        if (count > 10) {
            stats.Critico++;
        } else if (status === 'VERIFICADA') {
            stats.Verificada++;
        } else if (status === 'EM REVISÃO' || status === 'REVISAR') {
            stats.Revisar++;
        } else {
            stats.Pendente++;
        }
    });

    return [
        { status: 'Verificada', count: stats.Verificada, color: '#22C55E' },
        { status: 'Revisar', count: stats.Revisar, color: '#EAB308' },
        { status: 'Crítico', count: stats.Critico, color: '#EF4444' },
        { status: 'Pendente', count: stats.Pendente, color: '#9CA3AF' }
    ];
}

export async function getTopSalasImpactadas(edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    let query = db.select({
        sala: apontamentos.sala,
        count: sql<number>`count(*)`,
        edificacao: apontamentos.edificacao
    }).from(apontamentos);

    if (edificacao) {
        query.where(eq(apontamentos.edificacao, edificacao));
    }

    // Simplificado group by para evitar erros no Postgres com colunas filtradas
    return await query
        .groupBy(apontamentos.sala, apontamentos.edificacao)
        .orderBy(desc(sql`count(*)`))
        .limit(5);
}

export async function getApontamentosPorSala() {
    const db = await getDb();
    if (!db) return [];
    const results = await db.select({
        sala: apontamentos.sala,
        count: sql<number>`count(*)`
    }).from(apontamentos).groupBy(apontamentos.sala).orderBy(desc(sql`count(*)`)).limit(10);

    return results.map((r: any) => ({ ...r, count: Number(r.count) }));
}

export async function getApontamentosPorDisciplina(edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    // Coalesce null disciplines to a default label
    const disciplinaCol = isPostgres
        ? sql<string>`COALESCE(${apontamentos.disciplina}, 'Não Informada')`
        : sql<string>`COALESCE(${apontamentos.disciplina}, 'Não Informada')`;

    let query: any = db.select({
        disciplina: disciplinaCol,
        count: sql<number>`count(*)`
    }).from(apontamentos);

    if (edificacao) query = query.where(eq(apontamentos.edificacao, edificacao));

    const results = await query.groupBy(disciplinaCol).orderBy(desc(sql`count(*)`));
    return results.map((r: any) => ({
        disciplina: r.disciplina,
        count: Number(r.count)
    }));
}

export async function getTopDivergencias() {
    const db = await getDb();
    if (!db) return [];
    return db.select({
        divergencia: apontamentos.divergencia,
        count: sql<number>`count(*)`
    }).from(apontamentos).groupBy(apontamentos.divergencia).orderBy(desc(sql`count(*)`)).limit(5);
}

export async function getApontamentosPorSemana(edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    // 1. Apontamentos Data and Weekly format (from aba "Apontamentos RA Obra")
    const dayCol = isPostgres ? apontamentos.data : sql`"data" / 1000`;
    const weekFormat = isPostgres
        ? sql<string>`to_char(${dayCol}, 'IYYY-"W"IW')`
        : sql<string>`strftime('%Y-W%W', ${dayCol}, 'unixepoch')`;

    // 2. Verified Rooms Data and Weekly format (strictly dataVerificada column H)
    const salasWeekFormat = isPostgres
        ? sql<string>`to_char(${salas.dataVerificada}, 'IYYY-"W"IW')`
        : sql<string>`strftime('%Y-W%W', ${salas.dataVerificada} / 1000, 'unixepoch')`;

    // 3. Query Appointments
    let aQuery: any = db.select({
        semana: weekFormat,
        count: sql<number>`count(*)`
    }).from(apontamentos);
    if (edificacao) aQuery = aQuery.where(eq(apontamentos.edificacao, edificacao));
    const weeklyApontamentos = await aQuery.groupBy(weekFormat).orderBy(weekFormat);

    // 4. Query Verified Rooms (strictly from dataVerificada column H)
    let sQuery: any = db.select({
        semana: salasWeekFormat,
        count: sql<number>`count(*)`
    }).from(salas).where(sql`${salas.dataVerificada} IS NOT NULL`);

    if (edificacao) sQuery = sQuery.where(eq(salas.edificacao, edificacao));
    const weeklyVerificacoes = await sQuery.groupBy(salasWeekFormat).orderBy(salasWeekFormat);

    // 5. Merge results
    const weeksMap = new Map<string, { semana: string; count: number; verifiedRooms: number }>();

    weeklyApontamentos.forEach((a: any) => {
        weeksMap.set(a.semana, { semana: a.semana, count: Number(a.count), verifiedRooms: 0 });
    });

    weeklyVerificacoes.forEach((v: any) => {
        const existing = weeksMap.get(v.semana);
        if (existing) {
            existing.verifiedRooms = Number(v.count);
        } else {
            weeksMap.set(v.semana, { semana: v.semana, count: 0, verifiedRooms: Number(v.count) });
        }
    });

    return Array.from(weeksMap.values())
        .map(w => ({ ...w, count: Number(w.count), verifiedRooms: Number(w.verifiedRooms) }))
        .sort((a, b) => a.semana.localeCompare(b.semana));
}

// ============================================================================
// EDIFICAÇÃO FUNCTIONS
// ============================================================================

export async function getEdificacoes() {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select({ edificacao: salas.edificacao }).from(salas).groupBy(salas.edificacao).orderBy(salas.edificacao);
    return result.map((r: any) => r.edificacao).filter(Boolean);
}

export async function getKPIsPorEdificacao(edificacao: string) {
    const kpis = await getKPIs(edificacao);
    return kpis ? { ...kpis, edificacao } : null;
}

export async function getSalasPorEdificacao() {
    const db = await getDb();
    if (!db) return [];
    return db.select({
        edificacao: salas.edificacao,
        count: sql<number>`count(*)`
    }).from(salas).groupBy(salas.edificacao).orderBy(salas.edificacao);
}

export async function getApontamentosPorEdificacao() {
    const db = await getDb();
    if (!db) return [];
    return db.select({
        edificacao: salas.edificacao,
        count: sql<number>`count(${apontamentos.id})`
    }).from(salas).leftJoin(apontamentos, eq(salas.nome, apontamentos.sala)).groupBy(salas.edificacao).orderBy(salas.edificacao);
}

// ============================================================================
// DATA INTEGRITY FUNCTIONS
// ============================================================================

export async function getValidacaoIntegridade() {
    const db = await getDb();
    if (!db) return null;

    const apontamentosResult = await db.select({
        sala: apontamentos.sala,
        edificacao: apontamentos.edificacao,
        count: sql<number>`count(*)`
    }).from(apontamentos).groupBy(apontamentos.sala, apontamentos.edificacao);

    const salasResult = await db.select({ nome: salas.nome }).from(salas);
    const salasMapeadas = new Set(salasResult.map((s: any) => s.nome));

    const naoMapeados = apontamentosResult.filter((a: any) => !salasMapeadas.has(a.sala));
    const totalApontamentosNaoMapeados = naoMapeados.reduce((sum: number, item: any) => sum + item.count, 0);

    return {
        temProblemas: totalApontamentosNaoMapeados > 0,
        totalApontamentosNaoMapeados,
        totalSalasNaoMapeadas: naoMapeados.length,
        apontamentosNaoMapeados: naoMapeados.map((item: any) => ({
            sala: item.sala,
            edificacao: item.edificacao,
            totalApontamentos: item.count
        }))
    };
}

// ============================================================================
// IFC FILES FUNCTIONS
// ============================================================================

export async function getAllIfcFiles() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ifcFiles);
}

export async function getIfcFilesByEdificacao(edificacao: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ifcFiles).where(eq(ifcFiles.edificacao, edificacao));
}

export async function getIfcFileById(id: number) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(ifcFiles).where(eq(ifcFiles.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function getRoomStatusColor(nomeSala: string): Promise<string> {
    const sala = await getSalaByNome(nomeSala);
    if (!sala) return '#9CA3AF';

    const apontamentosSala = await getApontamentosBySala(nomeSala);
    if (apontamentosSala.length > 10) return '#EF4444';

    const status = (sala.status || '').toUpperCase();
    if (status.includes('VERIFICADA')) return '#22C55E';
    if (status.includes('REVISÃO') || status.includes('REVISAR')) return '#EAB308';
    if (status.includes('CRÍTICO')) return '#EF4444';
    return '#9CA3AF';
}

export async function getAllRoomsWithColors() {
    const db = await getDb();
    if (!db) return [];

    // 1. Get all rooms
    const allSalas = await db.select().from(salas);

    // 2. Get pointing counts for ALL rooms in one go (much faster)
    const pointingCounts = await db.select({
        sala: apontamentos.sala,
        count: sql<number>`count(*)`
    }).from(apontamentos).groupBy(apontamentos.sala);

    const pointingMap = new Map(pointingCounts.map((p: any) => [p.sala, Number(p.count)]));

    // 3. Map each room to its calculated status/color
    return allSalas.map((sala: any) => {
        const count = Number(pointingMap.get(sala.nome) || 0);
        let color = '#9CA3AF'; // Pendente (Slate-400)

        const status = (sala.status || '').toUpperCase();
        if (status.includes('VERIFICADA')) color = '#22C55E'; // Emerald-500
        else if (status.includes('REVISÃO') || status.includes('REVISAR')) color = '#EAB308'; // Amber-500
        else if (status.includes('CRÍTICO') || count > 10) color = '#EF4444'; // Rose-500
        else if (count > 0) color = '#F59E0B'; // Amber-500 (Legacy fallback)

        return {
            ...sala,
            color,
            numApontamentos: count
        };
    });
}

// --- Entregas As-Built ---
export async function getEntregas() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(entregasAsBuilt).orderBy(desc(entregasAsBuilt.dataPrevista));
}

export async function getEntregasHistorico(id: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(entregasHistorico)
        .where(eq(entregasHistorico.entregaId, id))
        .orderBy(desc(entregasHistorico.createdAt));
}

export async function upsertEntrega(data: any) {
    const db = await getDb();
    if (!db) return null;

    const { id, comentario, ...values } = data; // Extract comment if present

    // Convert string dates to Date objects setting time to Noon to avoid timezone shifts
    if (values.dataPrevista && typeof values.dataPrevista === 'string') {
        values.dataPrevista = new Date(values.dataPrevista + 'T12:00:00');
    }
    if (values.dataRecebimento && typeof values.dataRecebimento === 'string') {
        values.dataRecebimento = new Date(values.dataRecebimento + 'T12:00:00');
    }

    let result;

    if (id) {
        // Retrieve current state for comparison
        const current = await db.select().from(entregasAsBuilt).where(eq(entregasAsBuilt.id, id)).limit(1);
        const oldStatus = current.length > 0 ? current[0].status : null;

        result = await db.update(entregasAsBuilt)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(entregasAsBuilt.id, id))
            .returning();

        // Log Status Change if changed
        if (oldStatus && values.status && oldStatus !== values.status) {
            await db.insert(entregasHistorico).values({
                entregaId: id,
                acao: 'STATUS_ALTERADO',
                descricao: `Status alterado de "${oldStatus}" para "${values.status}"`,
                usuario: 'Usuário', // In a real app, pass the user from Context
                createdAt: new Date()
            });
        }

        // Log Edit Action if strictly editing (not just status/comment)
        // For simplicity, we assume if it's an update not just status/comment, it's an edit.
        // But since we upsert everything, we can just check if other fields changed, 
        // OR we can just rely on the user explicit comment/action.
        // For now, let's just log "Atualizado" if no specific status change or comment.
    } else {
        result = await db.insert(entregasAsBuilt)
            .values({
                ...values,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();

        // Log Creation
        if (result && result.length > 0) {
            await db.insert(entregasHistorico).values({
                entregaId: result[0].id,
                acao: 'CRIADO',
                descricao: `Entrega criada: ${values.nomeDocumento}`,
                usuario: 'Usuário',
                createdAt: new Date()
            });
        }
    }

    // Handle Comment
    if (comentario && id) {
        await db.insert(entregasHistorico).values({
            entregaId: id,
            acao: 'COMENTARIO',
            descricao: comentario,
            usuario: 'Usuário',
            createdAt: new Date()
        });
    }

    return result;
}

export async function deleteEntrega(id: number) {
    const db = await getDb();
    if (!db) return false;
    await db.delete(entregasAsBuilt).where(eq(entregasAsBuilt.id, id));
    return true;
}

export async function getEntregasStats(edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    let query = db.select().from(entregasAsBuilt);
    if (edificacao) {
        (query as any) = query.where(eq(entregasAsBuilt.edificacao, edificacao));
    }

    const all = await query;
    const now = new Date();

    return {
        total: all.length,
        aguardando: all.filter((e: any) => e.status === 'AGUARDANDO').length,
        recebidos: all.filter((e: any) => e.status === 'RECEBIDO').length,
        emRevisao: all.filter((e: any) => e.status === 'EM_REVISAO').length,
        validados: all.filter((e: any) => e.status === 'VALIDADO').length,
        rejeitados: all.filter((e: any) => e.status === 'REJEITADO').length,
        atrasados: all.filter((e: any) =>
            e.status === 'AGUARDANDO' &&
            new Date(e.dataPrevista) < now
        ).length,
    };
}

// --- Field Report Functions ---

export async function createApontamento(data: InsertApontamento) {
    const db = await getDb();
    if (!db) return null;

    // Ensure data is current
    const values = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    return await db.insert(apontamentos).values(values).returning();
}

export async function updateSalaStatus(id: number, data: Partial<InsertSala>) {
    const db = await getDb();
    if (!db) return null;

    return await db.update(salas)
        .set({
            ...data,
            updatedAt: new Date()
        })
        .where(eq(salas.id, id))
        .returning();
}
