/*
 * ESTE ARQUIVO É O "CÉREBRO" DO BANCO DE DADOS.
 * Ele contém todas as funções que salvam e buscam informações (como as fotos dos relatórios e os dados dos modelos).
 * Eu adicionei aqui a lógica para calcular as porcentagens de entrega que você vê no Dashboard.
 */

import "dotenv/config";
import { eq, and, sql, desc } from "drizzle-orm";
// import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3"; // REMOVED STATIC IMPORT
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
// import Database from "better-sqlite3"; // REMOVED STATIC IMPORT
import postgres from "postgres";
// import * as sqliteSchema from "../drizzle/schema.ts"; // Not used anymore
import * as pgSchema from "../drizzle/schema.pg.ts";

// Re-export tables based on active dialect
// Forcing Postgres Schema
const isPostgres = true; // Hardcoded for production stability as we removed SQLite
const activeSchema = pgSchema;

export const { users, salas, apontamentos, ifcFiles, uploads, escopoAsBuilt, entregasAsBuilt, entregasHistorico, projects, projectMembers, verificacaoModelo } = activeSchema as any;

// Temporary type alignment (since we used to export from sqliteSchema)
export type InsertUser = typeof pgSchema.users.$inferInsert;
export type InsertApontamento = typeof pgSchema.apontamentos.$inferInsert;
export type InsertSala = typeof pgSchema.salas.$inferInsert;
export type InsertProject = typeof pgSchema.projects.$inferInsert;
export type Project = typeof pgSchema.projects.$inferSelect;

let _db: any = null;
let _client: any = null;

export async function getDb() {
    if (!_db) {
        try {
            if (process.env.DATABASE_URL) {
                console.log("[Database] Connecting to PostgreSQL...");
                // Postgres connection
                _client = postgres(process.env.DATABASE_URL, {
                    ssl: { rejectUnauthorized: false },
                    max: 10,
                    prepare: false
                });
                _db = drizzlePg(_client, { schema: pgSchema });
            } else {
                console.warn("[Database] DATABASE_URL is missing! Queries will fail.");
                return null;
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

export async function getDistinctPavimentos(edificacao?: string) {
    const db = await getDb();
    if (!db) return [];
    
    let query = db.selectDistinct({ pavimento: salas.pavimento }).from(salas);
    if (edificacao && edificacao !== "Todas") {
        query = query.where(eq(salas.edificacao, edificacao));
    }
    
    const result = await query;
    return result.map((r: any) => r.pavimento).filter(Boolean).sort();
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

export async function deleteApontamento(id: number) {
    const db = await getDb();
    if (!db) return null;

    // 1. Buscar o contexto (sala, edificacao, pavimento) para saber quem renumerar
    const target = await db.select().from(apontamentos).where(eq(apontamentos.id, id)).limit(1);
    if (target.length === 0) return null;

    const { sala, edificacao, pavimento } = target[0];

    // 2. Deletar o apontamento
    await db.delete(apontamentos).where(eq(apontamentos.id, id));

    // 3. Buscar todos os que sobraram na mesma sala/pavimento/edificação
    // Ordenamos pela data original para manter a sequência histórica correta
    const remaining = await db.select()
        .from(apontamentos)
        .where(
            and(
                eq(apontamentos.sala, sala),
                eq(apontamentos.edificacao, edificacao),
                eq(apontamentos.pavimento, pavimento)
            )
        )
        .orderBy(apontamentos.data); 

    // 4. Atualizar a numeração de todos para garantir que não haja "buracos"
    for (let i = 0; i < remaining.length; i++) {
        const novoNumero = i + 1;
        if (remaining[i].numeroApontamento !== novoNumero) {
            await db.update(apontamentos)
                .set({ numeroApontamento: novoNumero })
                .where(eq(apontamentos.id, remaining[i].id));
        }
    }

    return true;
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

    // Helper for week format
    const getWeekFormat = (col: any) => isPostgres
        ? sql<string>`to_char(${col}, 'IYYY-"W"IW')`
        : sql<string>`strftime('%Y-W%W', ${col} / 1000, 'unixepoch')`;

    // 3. Query Appointments (count findings)
    const weeklyApontamentos = await db.select({
        semana: weekFormat,
        count: sql<number>`count(*)`
    }).from(apontamentos)
        .where(edificacao ? eq(apontamentos.edificacao, edificacao) : sql`TRUE`)
        .groupBy(weekFormat);

    // 4. Query Verified Rooms - Date 1 (dataVerificada)
    const weeklyV1 = await db.select({
        semana: getWeekFormat(salas.dataVerificada),
        count: sql<number>`count(*)`
    }).from(salas)
        .where(and(
            sql`${salas.dataVerificada} IS NOT NULL`,
            edificacao ? eq(salas.edificacao, edificacao) : sql`TRUE`
        ))
        .groupBy(getWeekFormat(salas.dataVerificada));

    // 5. Query Verified Rooms - Date 2 (dataVerificacao2)
    const weeklyV2 = await db.select({
        semana: getWeekFormat(salas.dataVerificacao2),
        count: sql<number>`count(*)`
    }).from(salas)
        .where(and(
            sql`${salas.dataVerificacao2} IS NOT NULL`,
            edificacao ? eq(salas.edificacao, edificacao) : sql`TRUE`
        ))
        .groupBy(getWeekFormat(salas.dataVerificacao2));

    // 6. Merge results
    const weeksMap = new Map<string, { semana: string; count: number; verifiedRooms: number }>();

    // Add appointments
    weeklyApontamentos.forEach((a: any) => {
        weeksMap.set(a.semana, { semana: a.semana, count: Number(a.count), verifiedRooms: 0 });
    });

    // Add V1 verifications
    weeklyV1.forEach((v: any) => {
        const existing = weeksMap.get(v.semana);
        if (existing) {
            existing.verifiedRooms += Number(v.count);
        } else {
            weeksMap.set(v.semana, { semana: v.semana, count: 0, verifiedRooms: Number(v.count) });
        }
    });

    // Add V2 verifications
    weeklyV2.forEach((v: any) => {
        const existing = weeksMap.get(v.semana);
        if (existing) {
            existing.verifiedRooms += Number(v.count);
        } else {
            weeksMap.set(v.semana, { semana: v.semana, count: 0, verifiedRooms: Number(v.count) });
        }
    });

    return Array.from(weeksMap.values())
        .map(w => ({
            semana: w.semana || 'Sem Data',
            count: Number(w.count),
            verifiedRooms: Number(w.verifiedRooms)
        }))
        .filter(w => w.semana !== 'Sem Data')
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

    const { id, comentario, ...rawValues } = data; // Extract comment if present

    // Remove undefined values to prevent Drizzle parameter mismatch
    const values = Object.fromEntries(
        Object.entries(rawValues).filter(([_, v]) => v !== undefined)
    ) as any;

    // Convert string dates to Date objects setting time to Noon to avoid timezone shifts
    if (values.dataPrevista && typeof values.dataPrevista === 'string') {
        values.dataPrevista = new Date(values.dataPrevista + 'T12:00:00');
    }
    if (values.dataRecebimento && typeof values.dataRecebimento === 'string') {
        values.dataRecebimento = new Date(values.dataRecebimento + 'T12:00:00');
    }
    if (values.periodoInicio && typeof values.periodoInicio === 'string') {
        values.periodoInicio = new Date(values.periodoInicio + 'T12:00:00');
    }
    if (values.periodoFim && typeof values.periodoFim === 'string') {
        values.periodoFim = new Date(values.periodoFim + 'T12:00:00');
    }

    let result;
    const { escopoIds, ...commonValues } = values;

    if (escopoIds && Array.isArray(escopoIds)) {
        // BATCH MODE: Create multiple entries for a single delivery action
        return await db.transaction(async (tx: any) => {
            const batchResults = [];
            for (const escId of escopoIds) {
                // Fetch scope details to fill in missing info
                const [esc] = await tx.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.id, escId)).limit(1);
                if (!esc) continue;

                const newRecord = await tx.insert(entregasAsBuilt)
                    .values({
                        ...commonValues,
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
                        updatedAt: new Date()
                    })
                    .returning();

                if (newRecord && newRecord.length > 0) {
                    batchResults.push(newRecord[0]);
                    await tx.insert(entregasHistorico).values({
                        entregaId: newRecord[0].id,
                        acao: 'CRIADO',
                        descricao: `Entrega em lote criada: ${commonValues.nomeDocumento}`,
                        usuario: 'Usuário',
                        createdAt: new Date()
                    });
                }
            }
            return batchResults;
        });
    }

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

    // 1. Get total from Master List (escopo)
    let escopoQuery = db.select().from(escopoAsBuilt);
    if (edificacao) {
        (escopoQuery as any) = escopoQuery.where(eq(escopoAsBuilt.edificacao, edificacao));
    }
    const escopos = await escopoQuery;

    // 2. Get delivery log
    let entregaQuery = db.select().from(entregasAsBuilt);
    if (edificacao) {
        (entregaQuery as any) = entregaQuery.where(eq(entregasAsBuilt.edificacao, edificacao));
    }
    const entregas = await entregaQuery;
    
    // 3. Calculate "Mapeado" (Aguardando)
    // It's the total models minus those that have at least one delivery recorded or validated
    const deliveredEscopoIds = new Set(entregas.map((e: any) => e.escopoId).filter(Boolean));
    const aguardando = escopos.length - deliveredEscopoIds.size;

    return {
        total: escopos.length,
        aguardando: aguardando,
        recebidos: entregas.length, // Log entries
        emRevisao: entregas.filter((e: any) => e.status === 'EM_REVISAO').length,
        validados: entregas.filter((e: any) => e.status === 'VALIDADO').length,
        validadosParcial: entregas.filter((e: any) => e.status === 'VALIDADO_PARCIAL').length,
        validadosRessalva: entregas.filter((e: any) => e.status === 'VALIDADO_RESSALVA').length,
        rejeitados: entregas.filter((e: any) => e.status === 'REJEITADO').length,
        atrasados: 0 // Removed as requested
    };
}

export async function getAsBuiltStatus() {
    const db = await getDb();
    if (!db) return null;

    const escopos = await db.select().from(escopoAsBuilt);
    const entregas = await db.select().from(entregasAsBuilt);

    const totalModelos = escopos.length;
    const comRvt = escopos.filter((e: any) => e.temRvtOriginal === 1).length;
    const semRvt = totalModelos - comRvt;

    // A model is considered covered if there's at least one VALIDATED delivery for it
    const validadosIds = new Set(entregas.filter((e: any) => e.status === 'VALIDADO').map((e: any) => e.escopoId));
    const modelosValidados = escopos.filter((e: any) => validadosIds.has(e.id)).length;

    // A model is received if there's at least one RECEBIDO or VALIDADO delivery
    const recebidosIds = new Set(entregas.filter((e: any) => ['RECEBIDO', 'VALIDADO', 'EM_REVISAO'].includes(e.status)).map((e: any) => e.escopoId));
    const modelosRecebidos = escopos.filter((e: any) => recebidosIds.has(e.id)).length;

    return {
        totalModelos,
        modelosValidados,
        modelosRecebidos,
        modelosPendentes: totalModelos - modelosRecebidos,
        comRvt,
        semRvt,
        percentualCobertura: totalModelos > 0 ? (modelosValidados / totalModelos) * 100 : 0
    };
}

// ============================================================================
// ESCOPO AS-BUILT (LISTA MESTRA) FUNCTIONS
// ============================================================================

export async function getEscopos() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(escopoAsBuilt).orderBy(desc(escopoAsBuilt.createdAt));
}

export async function upsertEscopo(data: any) {
    const db = await getDb();
    if (!db) return null;

    const { id, ...rawValues } = data;

    // Remove undefined values to prevent Drizzle parameter mismatch
    const values = Object.fromEntries(
        Object.entries(rawValues).filter(([_, v]) => v !== undefined)
    ) as any;

    if (id) {
        const result = await db.update(escopoAsBuilt)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(escopoAsBuilt.id, id))
            .returning();
        return result[0];
    } else {
        const result = await db.insert(escopoAsBuilt)
            .values({
                ...values,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();
        return result[0];
    }
}

export async function deleteEscopo(id: number) {
    const db = await getDb();
    if (!db) return false;
    await db.delete(escopoAsBuilt).where(eq(escopoAsBuilt.id, id));
    return true;
}

export async function getEntregasByEscopo(escopoId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(entregasAsBuilt)
        .where(eq(entregasAsBuilt.escopoId, escopoId))
        .orderBy(desc(entregasAsBuilt.dataPrevista));
}

export async function registrarVerificacao(data: { id: number, resultado: string, apontamentosVerificacao?: string | null }) {
    const db = await getDb();
    if (!db) return null;

    const newStatus = data.resultado === 'CONFORME' ? 'VALIDADO' : 'REJEITADO';

    const result = await db.update(entregasAsBuilt)
        .set({
            resultado: data.resultado,
            dataVerificacao: new Date(),
            apontamentosVerificacao: data.apontamentosVerificacao || null,
            status: newStatus,
            updatedAt: new Date()
        })
        .where(eq(entregasAsBuilt.id, data.id))
        .returning();

    // Log the verification in history
    if (result && result.length > 0) {
        await db.insert(entregasHistorico).values({
            entregaId: data.id,
            acao: 'STATUS_ALTERADO',
            descricao: `Verificação: ${data.resultado}${data.apontamentosVerificacao ? ' — ' + data.apontamentosVerificacao : ''}`,
            usuario: 'Usuário',
            createdAt: new Date()
        });
    }

    return result;
}

// --- Field Report Functions ---

export async function createApontamento(data: InsertApontamento) {
    const db = await getDb();
    if (!db) return null;

    // Auto-generate sequential numeroApontamento
    const [maxResult] = await db.select({
        maxNum: sql<number>`COALESCE(MAX(${apontamentos.numeroApontamento}), 0)`
    }).from(apontamentos);
    const nextNum = (Number(maxResult?.maxNum) || 0) + 1;

    const values = {
        ...data,
        numeroApontamento: nextNum,
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

// ============================================================================
// PROJECT FUNCTIONS
// ============================================================================

export async function listProjects(ownerId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.createdAt));
}

export async function createProject(data: InsertProject) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.insert(projects).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning();
    return result[0];
}

export async function getProjectById(id: string) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function updateProject(id: string, data: Partial<InsertProject>) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
    return result[0];
}

export async function saveMasterList(projectId: string, salasList: Array<{
    edificacao: string;
    pavimento: string;
    setor: string;
    nome: string;
    numeroSala: string;
}>) {
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
            status: 'PENDENTE',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        created++;
    }

    return { created };
}

export async function getSalasByProjectId(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(salas)
        .where(eq(salas.projectId, projectId))
        .orderBy(salas.edificacao, sql`CAST(${salas.numeroSala} AS INTEGER)`);
}

export async function updateSala(id: number, data: {
    nome?: string;
    numeroSala?: string;
    edificacao?: string;
    pavimento?: string;
    setor?: string;
}) {
    const db = await getDb();
    if (!db) return null;
    const result = await db.update(salas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(salas.id, id))
        .returning();
    return result[0];
}

export async function deleteSala(id: number) {
    const db = await getDb();
    if (!db) return false;
    await db.delete(salas).where(eq(salas.id, id));
    return true;
}

/**
 * Renumber rooms in an edificação: increment numeroSala by +1 for all rooms
 * where CAST(numeroSala AS INTEGER) >= fromNumber.
 * This is used when inserting/splitting a room — it opens a "slot" at fromNumber.
 */
export async function renumberSalasInEdificacao(
    projectId: string,
    edificacao: string,
    fromNumber: number
) {
    const db = await getDb();
    if (!db) return 0;

    // Get all rooms in this edificação with numero >= fromNumber, ordered DESC
    // (must update from highest to lowest to avoid unique conflicts)
    const roomsToShift = await db.select()
        .from(salas)
        .where(
            and(
                eq(salas.projectId, projectId),
                eq(salas.edificacao, edificacao),
                sql`CAST(${salas.numeroSala} AS INTEGER) >= ${fromNumber}`
            )
        )
        .orderBy(sql`CAST(${salas.numeroSala} AS INTEGER) DESC`);

    for (const room of roomsToShift) {
        const currentNum = parseInt(room.numeroSala, 10);
        await db.update(salas)
            .set({ numeroSala: String(currentNum + 1), updatedAt: new Date() })
            .where(eq(salas.id, room.id));
    }

    return roomsToShift.length;
}

// ============================================================================
// AS-BUILT VERIFICATION FUNCTIONS
// ============================================================================

export async function getVerificacoes(salaId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(verificacaoModelo).where(eq(verificacaoModelo.salaId, salaId));
}

export async function upsertVerificacao(salaId: number, disciplina: string, status: string, observacao?: string | null) {
    const db = await getDb();
    if (!db) return null;

    const existing = await db.select().from(verificacaoModelo)
        .where(and(eq(verificacaoModelo.salaId, salaId), eq(verificacaoModelo.disciplina, disciplina)))
        .limit(1);

    if (existing.length > 0) {
        return await db.update(verificacaoModelo)
            .set({ status, observacao: observacao || null, updatedAt: new Date() })
            .where(eq(verificacaoModelo.id, existing[0].id))
            .returning();
    } else {
        return await db.insert(verificacaoModelo)
            .values({
                salaId,
                disciplina,
                status,
                observacao: observacao || null,
                updatedAt: new Date()
            })
            .returning();
    }
}
