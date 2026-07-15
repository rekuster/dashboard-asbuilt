/*
 * ESTE ARQUIVO É O "CÉREBRO" DO BANCO DE DADOS.
 * Ele contém todas as funções que salvam e buscam informações (como as fotos dos relatórios e os dados dos modelos).
 * Eu adicionei aqui a lógica para calcular as porcentagens de entrega que você vê no Dashboard.
 * 
 * NOTA: Este arquivo foi atualizado para corrigir o erro de fuso horário, garantindo que as datas
 * escolhidas pelo usuário não mudem sozinhas ao serem salvas.
 */

import "dotenv/config";
import { eq, and, sql, desc, like, or, exists } from "drizzle-orm";
// import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3"; // REMOVED STATIC IMPORT
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
// import Database from "better-sqlite3"; // REMOVED STATIC IMPORT
import postgres from "postgres";
// import * as sqliteSchema from "../drizzle/schema.ts"; // Not used anymore
import * as pgSchema from "../drizzle/schema.pg";
import { format, startOfWeek, differenceInCalendarWeeks, addWeeks } from "date-fns";

// Re-export tables based on active dialect
// Forcing Postgres Schema
const isPostgres = true; // Hardcoded for production stability as we removed SQLite
const activeSchema = pgSchema;

export const { users, salas, apontamentos, ifcFiles, uploads, escopoAsBuilt, entregasAsBuilt, entregasHistorico, projects, projectMembers, verificacaoModelo, relatoriosDivergencia } = activeSchema as any;

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
                    max: 3, // Reduzido de 10 para 3 para evitar estourar o limite de 15 conexões do Supabase em desenvolvimento/hot-reload
                    prepare: false,
                    connect_timeout: 10 // Limite de 10 segundos para conectar, evitando travamentos
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

export async function getAllSalas(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(salas).where(eq(salas.projectId, projectId));
}

export async function getDistinctPavimentos(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];
    
    let query = db.selectDistinct({ pavimento: salas.pavimento }).from(salas).where(eq(salas.projectId, projectId));
    if (edificacao && edificacao !== "Todas") {
        query = query.where(and(eq(salas.projectId, projectId), eq(salas.edificacao, edificacao))) as any;
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

export async function getAllApontamentos(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(apontamentos).where(eq(apontamentos.projectId, projectId));
}

export async function getApontamentosBySala(nomeSala: string) {
    const db = await getDb();
    if (!db) return [];
    // Use like() with % to avoid issues with trailing spaces from Excel/User typing
    return db.select().from(apontamentos).where(like(apontamentos.sala, `%${nomeSala.trim()}%`));
}

export async function deleteApontamento(id: number) {
    const db = await getDb();
    if (!db) return null;

    // 1. Buscar o apontamento que será deletado para saber seu número e projeto
    const [target] = await db.select().from(apontamentos).where(eq(apontamentos.id, id)).limit(1);
    if (!target) return null;

    const { numeroApontamento: deletedNum, projectId } = target;

    // 2. Deletar o apontamento
    await db.delete(apontamentos).where(eq(apontamentos.id, id));

    // 3. Renumerar todos os seguintes dentro do mesmo projeto
    // Decrementamos o número de todos que eram maiores que o deletado
    if (projectId) {
        await db.update(apontamentos)
            .set({ 
                numeroApontamento: sql`${apontamentos.numeroApontamento} - 1`,
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(apontamentos.projectId, projectId),
                    sql`${apontamentos.numeroApontamento} > ${deletedNum}`
                )
            );
    } else {
        // Fallback global se não houver projectId vinculada
        await db.update(apontamentos)
            .set({ 
                numeroApontamento: sql`${apontamentos.numeroApontamento} - 1`,
                updatedAt: new Date()
            })
            .where(sql`${apontamentos.numeroApontamento} > ${deletedNum}`);
    }

    return true;
}

// ============================================================================
// KPI FUNCTIONS
// ============================================================================

export async function getKPIs(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    let sQuery = db.select({
        id: salas.id,
        status: salas.status,
        statusRA: salas.statusRA,
        dataVerificada: salas.dataVerificada,
        temForro: salas.temForro
    }).from(salas).where(eq(salas.projectId, projectId));

    let aQuery = db.select({
        id: apontamentos.id,
        sala: apontamentos.sala
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId));

    if (edificacao && edificacao !== "Todas") {
        sQuery = sQuery.where(and(eq(salas.projectId, projectId), eq(salas.edificacao, edificacao))) as any;
        aQuery = aQuery.where(and(eq(apontamentos.projectId, projectId), eq(apontamentos.edificacao, edificacao))) as any;
    }

    const [allSalas, allApontamentos] = await Promise.all([
        sQuery,
        aQuery
    ]);

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

    // ==========================================================
    // CÁLCULO DE TENDÊNCIA DE TÉRMINO (Velocidade Ativa GLOBAL)
    // ==========================================================
    const limitDays = 30; // Janela móvel de cálculo (últimos 30 dias)
    const agora = Date.now();
    const limitePast = agora - (limitDays * 24 * 60 * 60 * 1000);

    // O ritmo de verificação é da equipe (global), independente do prédio
    // Otimização: Reaproveitar 'allSalas' se edificacao for global, evitando uma query extra ao banco.
    // Caso contrário, seleciona apenas a coluna 'dataVerificada'.
    let globDatasRecentes: number[] = [];
    if (!edificacao || edificacao === "Todas") {
        globDatasRecentes = allSalas
            .map((s: any) => s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0)
            .filter((time: number) => time > limitePast);
    } else {
        const globSalas = await db.select({ dataVerificada: salas.dataVerificada }).from(salas).where(eq(salas.projectId, projectId));
        globDatasRecentes = globSalas
            .map((s: any) => s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0)
            .filter((time: number) => time > limitePast);
    }

    let velocidadeVerificacao = 0; // salas por dia (global)
    if (globDatasRecentes.length > 0) {
        const minDataRecente = Math.min(...globDatasRecentes);
        const diasAtivos = Math.max(1, (agora - minDataRecente) / (1000 * 60 * 60 * 24));
        velocidadeVerificacao = globDatasRecentes.length / diasAtivos;
    }

    let estimativaTermino: string | null = null;

    if (velocidadeVerificacao > 0 && salasVerificadas < totalSalas) {
        const salasRestantes = totalSalas - salasVerificadas;
        // Calculamos os dias restantes usando a velocidade global da equipe
        const diasRestantes = salasRestantes / velocidadeVerificacao;
        
        const dateTermino = new Date(agora + (diasRestantes * 1000 * 60 * 60 * 24));
        estimativaTermino = dateTermino.toISOString();
    } else if (salasVerificadas >= totalSalas && totalSalas > 0) {
        // Se 100% concluído, estimativa é igual à data de hoje (ou última)
        estimativaTermino = new Date(agora).toISOString();
    }

    const salasComForro = allSalas.filter((s: any) => !!s.temForro).length;

    // Salas com forro que já foram verificadas
    const salasVerificadasComForro = allSalas.filter((s: any) => {
        const isVerificada = ['VERIFICADA', 'REVISAR', 'EM REVISÃO'].includes((s.status || '').trim().toUpperCase());
        return !!s.temForro && isVerificada;
    }).length;

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
        estimativaTermino,
        velocidadeVerificacao,
        salasComForro,
        salasVerificadasComForro,
        percentualForroVerificadas: salasComForro > 0 ? (salasVerificadasComForro / salasComForro) * 100 : 0,
    };
}

export async function getTendenciaVerificacao(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    // Otimização: Selecionar apenas a coluna necessária
    let sQuery = db.select({ dataVerificada: salas.dataVerificada }).from(salas).where(eq(salas.projectId, projectId));
    if (edificacao && edificacao !== "Todas") {
        sQuery = db.select({ dataVerificada: salas.dataVerificada }).from(salas).where(and(eq(salas.projectId, projectId), eq(salas.edificacao, edificacao)));
    }
    const allSalas = await sQuery;
    const totalSalas = allSalas.length;

    // Extrair histórico de datas e ordenar
    const datasValidas = allSalas
        .map((s: any) => s.dataVerificada ? new Date(s.dataVerificada) : null)
        .filter((d: any) => d !== null) as Date[];

    datasValidas.sort((a, b) => a.getTime() - b.getTime());

    // Agrupar cumulativamente por data (YYYY-MM-DD -> total acumulado)
    const agrupamento: { [dateStr: string]: number } = {};
    let countRealizado = 0;
    
    // Formato DD/MM/YY para evitar confusão de ano
    datasValidas.forEach(d => {
        const diaStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
        countRealizado++;
        agrupamento[diaStr] = countRealizado;
    });

    const resultadoFinal: any[] = [];
    
    // Adicionar histórico no gráfico
    for (const data in agrupamento) {
        // Encontrar o timestamp original para essa label (aproximado pela última ocorrência)
        const dOriginal = datasValidas.reverse().find(d => 
            `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}` === data
        );
        datasValidas.reverse(); // Restaurar ordem

        resultadoFinal.push({
            name: data,
            timestamp: dOriginal?.getTime() || null,
            Realizado: agrupamento[data],
            Projetado: null
        });
    }

    // Se houve histórico, usar o cálculo de velocidade para gerar a projeção
    if (resultadoFinal.length > 0 && countRealizado < totalSalas) {
        // Obter velocidade Global usando a janela de 30 dias
        const limitDays = 30;
        const agora = Date.now();
        const limitePast = agora - (limitDays * 24 * 60 * 60 * 1000);
        
        // Otimização: Reaproveitar 'allSalas' se edificacao for global, evitando uma query extra ao banco.
        // Caso contrário, seleciona apenas a coluna 'dataVerificada'.
        let globDatasRecentes: number[] = [];
        if (!edificacao || edificacao === "Todas") {
            globDatasRecentes = allSalas
                .map((s: any) => s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0)
                .filter((time: number) => time > limitePast);
        } else {
            const globSalas = await db.select({ dataVerificada: salas.dataVerificada }).from(salas).where(eq(salas.projectId, projectId));
            globDatasRecentes = globSalas
                .map((s: any) => s.dataVerificada ? new Date(s.dataVerificada).getTime() : 0)
                .filter((time: number) => time > limitePast);
        }

        if (globDatasRecentes.length > 0) {
            const minDataRecente = Math.min(...globDatasRecentes);
            const diasAtivos = Math.max(1, (agora - minDataRecente) / (1000 * 60 * 60 * 24));
            const velocidade = globDatasRecentes.length / diasAtivos;
            
            // O último ponto real que temos
            const ultimoRegistro = resultadoFinal[resultadoFinal.length - 1];
            
            // Vamos adicionar o Ponto de Interseção (onde o Projetado começa exatamente onde o Realizado parou)
            ultimoRegistro.Projetado = ultimoRegistro.Realizado;
            
            // Salas restantes
            const salasRestantes = totalSalas - countRealizado;
            const diasFaltantes = salasRestantes / velocidade;
            
            // Projetar 1 ponto intermediário (metade do caminho) e 1 ponto final
            // Ponto Intermediário
            if (diasFaltantes > 2) {
                const tsMeio = agora + ((diasFaltantes / 2) * 1000 * 60 * 60 * 24);
                const dataMeio = new Date(tsMeio);
                const labelMeio = `${dataMeio.getDate().toString().padStart(2, '0')}/${(dataMeio.getMonth() + 1).toString().padStart(2, '0')}/${dataMeio.getFullYear().toString().slice(-2)}`;
                // Garantir de não repetir rotulo
                if (!resultadoFinal.find(r => r.name === labelMeio)) {
                    resultadoFinal.push({
                        name: labelMeio,
                        timestamp: tsMeio,
                        Realizado: null,
                        Projetado: Math.round(countRealizado + (salasRestantes / 2))
                    });
                }
            }

            // Ponto Final (Término)
            const tsFim = agora + (diasFaltantes * 1000 * 60 * 60 * 24);
            const dataFim = new Date(tsFim);
            const labelFim = `${dataFim.getDate().toString().padStart(2, '0')}/${(dataFim.getMonth() + 1).toString().padStart(2, '0')}/${dataFim.getFullYear().toString().slice(-2)}`;
            if (!resultadoFinal.find(r => r.name === labelFim)) {
                resultadoFinal.push({
                    name: labelFim,
                    timestamp: tsFim,
                    Realizado: null,
                    Projetado: totalSalas
                });
            } else {
                 const match = resultadoFinal.find(r => r.name === labelFim);
                 if (match) {
                     match.Projetado = totalSalas;
                     match.timestamp = tsFim;
                 }
            }
        }
    }

    return resultadoFinal;
}

export async function getStatsStatus(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    let sQuery = db.select({ status: salas.status }).from(salas).where(eq(salas.projectId, projectId));
    let aQuery = db.select({ sala: apontamentos.sala }).from(apontamentos).where(eq(apontamentos.projectId, projectId));

    if (edificacao && edificacao !== "Todas") {
        sQuery = sQuery.where(and(eq(salas.projectId, projectId), eq(salas.edificacao, edificacao))) as any;
        aQuery = aQuery.where(and(eq(apontamentos.projectId, projectId), eq(apontamentos.edificacao, edificacao))) as any;
    }

    const [allRooms, allApontamentos] = await Promise.all([
        sQuery,
        aQuery
    ]);

    const issuesPerRoom = new Map<string, number>();
    allApontamentos.forEach((a: any) => {
        issuesPerRoom.set(a.sala, (issuesPerRoom.get(a.sala) || 0) + 1);
    });

    const stats = { Verificada: 0, Revisar: 0, Pendente: 0 };

    allRooms.forEach((room: any) => {
        const status = (room.status || '').trim().toUpperCase();

        if (status === 'VERIFICADA') {
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
        { status: 'Pendente', count: stats.Pendente, color: '#9CA3AF' }
    ];
}

export async function getTopSalasImpactadas(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    let query = db.select({
        sala: apontamentos.sala,
        count: sql<number>`count(*)`,
        edificacao: apontamentos.edificacao
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId));

    if (edificacao) {
        query = query.where(and(eq(apontamentos.projectId, projectId), eq(apontamentos.edificacao, edificacao))) as any;
    }

    // Simplificado group by para evitar erros no Postgres com colunas filtradas
    return await query
        .groupBy(apontamentos.sala, apontamentos.edificacao)
        .orderBy(desc(sql`count(*)`))
        .limit(5);
}

export async function getApontamentosPorSala(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    const results = await db.select({
        sala: apontamentos.sala,
        count: sql<number>`count(*)`
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId)).groupBy(apontamentos.sala).orderBy(desc(sql`count(*)`)).limit(10);

    return results.map((r: any) => ({ ...r, count: Number(r.count) }));
}

export async function getApontamentosPorDisciplina(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    // Coalesce null disciplines to a default label
    const disciplinaCol = isPostgres
        ? sql<string>`COALESCE(${apontamentos.disciplina}, 'Não Informada')`
        : sql<string>`COALESCE(${apontamentos.disciplina}, 'Não Informada')`;

    let query: any = db.select({
        disciplina: disciplinaCol,
        count: sql<number>`count(*)`
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId));

    if (edificacao) query = query.where(and(eq(apontamentos.projectId, projectId), eq(apontamentos.edificacao, edificacao)));

    const results = await query.groupBy(disciplinaCol).orderBy(desc(sql`count(*)`));
    return results.map((r: any) => ({
        disciplina: r.disciplina,
        count: Number(r.count)
    }));
}

export async function getTopDivergencias(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select({
        divergencia: apontamentos.divergencia,
        count: sql<number>`count(*)`
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId)).groupBy(apontamentos.divergencia).orderBy(desc(sql`count(*)`)).limit(5);
}

export async function getApontamentosPorSemana(projectId: string, edificacao?: string) {
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

    // Otimização: Rodar as 3 consultas de agrupamento em paralelo via Promise.all
    const [weeklyApontamentos, weeklyV1, weeklyV2] = await Promise.all([
        // 3. Query Appointments (count findings)
        db.select({
            semana: weekFormat,
            count: sql<number>`count(*)`
        }).from(apontamentos)
            .where(edificacao && edificacao !== "Todas" ? and(eq(apontamentos.projectId, projectId), eq(apontamentos.edificacao, edificacao)) : eq(apontamentos.projectId, projectId))
            .groupBy(weekFormat),

        // 4. Query Verified Rooms - Date 1 (dataVerificada)
        db.select({
            semana: getWeekFormat(salas.dataVerificada),
            count: sql<number>`count(*)`
        }).from(salas)
            .where(and(
                sql`${salas.dataVerificada} IS NOT NULL`,
                eq(salas.projectId, projectId),
                edificacao && edificacao !== "Todas" ? eq(salas.edificacao, edificacao) : sql`TRUE`
            ))
            .groupBy(getWeekFormat(salas.dataVerificada)),

        // 5. Query Verified Rooms - Date 2 (dataVerificacao2)
        db.select({
            semana: getWeekFormat(salas.dataVerificacao2),
            count: sql<number>`count(*)`
        }).from(salas)
            .where(and(
                sql`${salas.dataVerificacao2} IS NOT NULL`,
                eq(salas.projectId, projectId),
                edificacao && edificacao !== "Todas" ? eq(salas.edificacao, edificacao) : sql`TRUE`
            ))
            .groupBy(getWeekFormat(salas.dataVerificacao2))
    ]);

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

    // 7. Sanitização Final: Garantir que apenas semanas válidas (formato YYYY-WXX) entram no gráfico.
    // Isso evita que slugs de disciplinas ou dados corrompidos poluam o eixo X.
    const weekRegex = /^\d{4}-W\d{2}$/;

    return Array.from(weeksMap.values())
        .map(w => ({
            semana: w.semana || 'Sem Data',
            count: Number(w.count),
            verifiedRooms: Number(w.verifiedRooms)
        }))
        .filter(w => weekRegex.test(w.semana))
        .sort((a, b) => a.semana.localeCompare(b.semana));
}

// ============================================================================
// EDIFICAÇÃO FUNCTIONS
// ============================================================================

export async function getEdificacoes(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select({ edificacao: salas.edificacao }).from(salas).where(eq(salas.projectId, projectId)).groupBy(salas.edificacao).orderBy(salas.edificacao);
    return result.map((r: any) => r.edificacao).filter(Boolean);
}

export async function getKPIsPorEdificacao(projectId: string, edificacao: string) {
    const kpis = await getKPIs(projectId, edificacao);
    return kpis ? { ...kpis, edificacao } : null;
}

export async function getTendenciaVerificacaoPorEdificacao(projectId: string, edificacao: string) {
    return await getTendenciaVerificacao(projectId, edificacao);
}

export async function getSalasPorEdificacao(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select({
        edificacao: salas.edificacao,
        count: sql<number>`count(*)`
    }).from(salas).where(eq(salas.projectId, projectId)).groupBy(salas.edificacao).orderBy(salas.edificacao);
}

export async function getApontamentosPorEdificacao(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select({
        edificacao: salas.edificacao,
        count: sql<number>`count(${apontamentos.id})`
    }).from(salas).leftJoin(apontamentos, eq(salas.nome, apontamentos.sala)).where(eq(salas.projectId, projectId)).groupBy(salas.edificacao).orderBy(salas.edificacao);
}

// ============================================================================
// DATA INTEGRITY FUNCTIONS
// ============================================================================

export async function getValidacaoIntegridade(projectId: string) {
    const db = await getDb();
    if (!db) return null;

    const apontamentosResult = await db.select({
        sala: apontamentos.sala,
        edificacao: apontamentos.edificacao,
        count: sql<number>`count(*)`
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId)).groupBy(apontamentos.sala, apontamentos.edificacao);

    const salasResult = await db.select({ nome: salas.nome }).from(salas).where(eq(salas.projectId, projectId));
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

export async function getAllIfcFiles(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ifcFiles).where(eq(ifcFiles.projectId, projectId));
}

export async function getIfcFilesByEdificacao(projectId: string, edificacao: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ifcFiles).where(
        and(
            eq(ifcFiles.projectId, projectId),
            eq(ifcFiles.edificacao, edificacao)
        )
    );
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

export async function getAllRoomsWithColors(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    // 1. Get all rooms
    const allSalas = await db.select().from(salas).where(eq(salas.projectId, projectId));

    // 2. Get pointing counts for ALL rooms in one go (much faster)
    const pointingCounts = await db.select({
        sala: apontamentos.sala,
        count: sql<number>`count(*)`
    }).from(apontamentos).where(eq(apontamentos.projectId, projectId)).groupBy(apontamentos.sala);

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
export async function getEntregas(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(entregasAsBuilt)
        .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
        .where(eq(escopoAsBuilt.projectId, projectId))
        .orderBy(desc(entregasAsBuilt.dataPrevista));
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

    // Aqui fazemos uma "limpeza" nas datas antes de salvar.
    // Como computadores em lugares diferentes podem entender horários de forma distinta, 
    // nós forçamos todas as datas para as 12:00 (meio-dia). 
    // Assim, o dia escolhido pelo usuário não "pula" para o dia anterior ou posterior.
    const normalizeDate = (d: any) => {
        if (!d) return d;
        let dateObj: Date;
        if (typeof d === 'string') {
            // Se for texto (ex: "2026-03-19"), montamos a data forçando meio-dia.
            dateObj = new Date(d + 'T12:00:00');
        } else if (d instanceof Date) {
            // Se já for um objeto de data, extraímos apenas o dia/mês/ano e forçamos meio-dia.
            const year = d.getFullYear();
            const month = d.getMonth();
            const day = d.getDate();
            dateObj = new Date(year, month, day, 12, 0, 0);
        } else {
            return d;
        }
        return dateObj;
    };

    if (values.dataPrevista) values.dataPrevista = normalizeDate(values.dataPrevista);
    if (values.dataRecebimento) values.dataRecebimento = normalizeDate(values.dataRecebimento);
    if (values.periodoInicio) values.periodoInicio = normalizeDate(values.periodoInicio);
    if (values.periodoFim) values.periodoFim = normalizeDate(values.periodoFim);
    if (values.dataVerificacao) values.dataVerificacao = normalizeDate(values.dataVerificacao);

    let result;
    const { escopoIds, escopoNames, ...commonValues } = values;

    if (escopoIds && Array.isArray(escopoIds)) {
        // BATCH MODE: Create multiple entries for a single delivery action
        return await db.transaction(async (tx: any) => {
            const batchResults = [];
            for (const escId of escopoIds) {
                // Fetch scope details to fill in missing info
                const [esc] = await tx.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.id, escId)).limit(1);
                if (!esc) continue;

                // Use individual name if provided in escopoNames map, otherwise fallback to common name
                const individualName = (escopoNames && escopoNames[String(escId)]) || commonValues.nomeDocumento;

                const newRecord = await tx.insert(entregasAsBuilt)
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
                        updatedAt: new Date()
                    })
                    .returning();

                if (newRecord && newRecord.length > 0) {
                    batchResults.push(newRecord[0]);
                    await tx.insert(entregasHistorico).values({
                        entregaId: newRecord[0].id,
                        acao: 'CRIADO',
                        descricao: `Entrega em lote criada: ${individualName}`,
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

export async function getEntregasStats(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    // 1. Get total from Master List (escopo)
    let escopoQuery = db.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.projectId, projectId));
    if (edificacao) {
        (escopoQuery as any) = escopoQuery.where(and(eq(escopoAsBuilt.projectId, projectId), eq(escopoAsBuilt.edificacao, edificacao)));
    }
    const escopos = await escopoQuery;

    // 2. Get delivery log (filtered via escopoAsBuilt join)
    let entregaQuery = db.select({ entregasAsBuilt }).from(entregasAsBuilt)
        .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
        .where(eq(escopoAsBuilt.projectId, projectId));
    if (edificacao) {
        (entregaQuery as any) = entregaQuery.where(and(eq(escopoAsBuilt.projectId, projectId), eq(entregasAsBuilt.edificacao, edificacao)));
    }
    const entregasRaw = await entregaQuery;
    const entregas = entregasRaw.map((r: any) => r.entregasAsBuilt);
    
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

export async function getAsBuiltStatus(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return null;

    let escopoQuery = db.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.projectId, projectId));
    if (edificacao) {
        escopoQuery = db.select().from(escopoAsBuilt)
            .where(and(eq(escopoAsBuilt.projectId, projectId), sql`${escopoAsBuilt.edificacao} ILIKE ${'%' + edificacao + '%'}`)) as any;
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
        consolidationFactor: projectModelsUnique.size > 0 ? (totalModelos / projectModelsUnique.size).toFixed(1) : "1.0",
        
        // Novos Indicadores Principais
        totalArquivos: allEntregas.length,
        modelosComEntrega: 0,
        comRvt: 0,
        semRvt: 0,
        modelosValidados: 0,
        modelosRecebidos: 0, // Em andamento/revisão
        modelosPendentes: 0,  // Nada recebido
        
        // Métricas de Qualidade
        taxaAprovacao: 0, // % de Conforme de primeira
        
        // Agrupamentos para Gráficos
        statsPorDisciplina: [] as any[],
        statsPorEmpresa: [] as any[],
        timelineRecebimento: [] as any[],
    };

    // 1. Processar Timeline (Agrupado por Quinzenas/2 Semanas)
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

    result.timelineRecebimento = Array.from(timelineMap.entries())
        .map(([mes, count]) => ({ mes, count }));
    // Observação: O timelineMap já mantém a ordem de inserção (que é cronológica por sortedEntregas)

    // 2. Calcular Eficiência (Taxa de Aprovação)
    const entregasComResultado = allEntregas.filter((e: any) => e.status === 'VALIDADO' || e.status === 'EM_REVISAO');
    const entregasConformes = allEntregas.filter((e: any) => e.status === 'VALIDADO');
    result.taxaAprovacao = entregasComResultado.length > 0 
        ? (entregasConformes.length / entregasComResultado.length) * 100 
        : 0;

    // 3. Processar Escopos e Agrupar Disciplinas/Empresas
    const disciplinaMap = new Map<string, { validado: number, recebido: number, pendente: number }>();
    const empresaMap = new Map<string, { total: number, concluido: number }>();

    escopos.forEach((escopo: any) => {
        const entregas = entregasMap.get(escopo.id) || [];
        // Consideramos VALIDADO como a entrega Final (Concluído)
        const hasValidado = entregas.some((e: any) => e.status === 'VALIDADO');
        const hasEntrega = entregas.length > 0;
        // Consideramos 'Em Análise' qualquer modelo que tenha entregas mas ainda não tenha a Final Validada
        const hasEmAndamento = hasEntrega && !hasValidado;

        // Contadores Gerais
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

        // Agrupamento por Disciplina com normalização para evitar duplicidade (ex: singular/plural)
        let disc = (escopo.disciplina || "Geral").trim();
        // Normalização específica para Média Tensão e casos comuns de digitação
        if (disc === "Média Tensão e Barramento") disc = "Média Tensão e Barramentos";
        
        if (!disciplinaMap.has(disc)) disciplinaMap.set(disc, { validado: 0, recebido: 0, pendente: 0 });
        const dStats = disciplinaMap.get(disc)!;
        if (hasValidado) dStats.validado++;
        else if (hasEmAndamento) dStats.recebido++;
        else dStats.pendente++;

        // Agrupamento por Empresa
        const emp = escopo.empresa || "Outros";
        if (!empresaMap.has(emp)) empresaMap.set(emp, { total: 0, concluido: 0 });
        const eStats = empresaMap.get(emp)!;
        eStats.total++;
        if (hasValidado) eStats.concluido++;
    });

    // Converter Maps para Arrays formatados para o Recharts
    result.statsPorDisciplina = Array.from(disciplinaMap.entries()).map(([name, stats]) => ({
        name,
        ...stats,
        total: stats.validado + stats.recebido + stats.pendente
    })).sort((a, b) => b.total - a.total);

    result.statsPorEmpresa = Array.from(empresaMap.entries()).map(([name, stats]) => ({
        name,
        total: stats.total,
        concluido: stats.concluido,
        percent: stats.total > 0 ? (stats.concluido / stats.total) * 100 : 0
    })).sort((a, b) => b.percent - a.percent);

    return {
        ...result,
        percentualCobertura: result.totalModelos > 0 ? (result.modelosValidados / result.totalModelos) * 100 : 0,
        percentualEntregasIniciadas: result.totalModelos > 0 ? (result.modelosComEntrega / result.totalModelos) * 100 : 0
    };
}

/**
 * Helper to get deliveries grouped by scope ID
 */
async function getEntregasPorEscopo(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return { entregasMap: new Map(), allEntregas: [] };

    let q = db.select({ entregasAsBuilt }).from(entregasAsBuilt)
        .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
        .where(eq(escopoAsBuilt.projectId, projectId));
    if (edificacao) {
        q = db.select({ entregasAsBuilt }).from(entregasAsBuilt)
            .innerJoin(escopoAsBuilt, eq(entregasAsBuilt.escopoId, escopoAsBuilt.id))
            .where(and(eq(escopoAsBuilt.projectId, projectId), sql`${entregasAsBuilt.edificacao} ILIKE ${'%' + edificacao + '%'}`)) as any;
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

// ============================================================================
// ESCOPO AS-BUILT (LISTA MESTRA) FUNCTIONS
// ============================================================================

export async function getEscopos(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(escopoAsBuilt).where(eq(escopoAsBuilt.projectId, projectId)).orderBy(desc(escopoAsBuilt.createdAt));
}

export async function upsertEscopo(data: {
    id?: number,
    empresa: string,
    disciplina: string,
    edificacao: string,
    nomeModelo: string,
    nomeModeloFinal?: string,
    descricao?: string | null,
    temRvtOriginal?: number,
    pendenciaRvt?: string | null,
    acaoRvt?: string | null,
    ativo?: number
}) {
    const db = await getDb();
    if (!db) return null;

    if (data.id) {
        const [result] = await db.update(escopoAsBuilt)
            .set({ 
                ...data, 
                updatedAt: new Date() 
            })
            .where(eq(escopoAsBuilt.id, data.id))
            .returning();
        return result;
    } else {
        const [result] = await db.insert(escopoAsBuilt)
            .values({
                projectId: null,
                empresa: data.empresa,
                disciplina: data.disciplina,
                edificacao: data.edificacao,
                nomeModelo: data.nomeModelo,
                nomeModeloFinal: data.nomeModeloFinal || data.nomeModelo,
                descricao: data.descricao || null,
                temRvtOriginal: data.temRvtOriginal ?? 0,
                pendenciaRvt: data.pendenciaRvt || null,
                acaoRvt: data.acaoRvt || null,
                ativo: data.ativo ?? 1,
            })
            .returning();
        return result;
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

    // =====================================================================
    // PARTE 1: Inserir com número sequencial atômico
    //
    // PROBLEMA ANTERIOR: lermos o MAX() e depois inseríamos em dois passos separados.
    // Quando vários apontamentos eram salvos ao mesmo tempo (ex: fila de sincronização),
    // todos liam o mesmo MAX antes de qualquer um ser confirmado → números duplicados.
    //
    // SOLUÇÃO: calculamos o próximo número DENTRO DO INSERT como subquery SQL.
    // O banco faz tudo em uma única operação, impedindo duplicatas.
    // =====================================================================
    const dataVerificacao = typeof data.data === 'string' ? new Date(data.data) : data.data;

    // Subquery: calcula o MAX na hora exata do INSERT — operação atômica
    const nextNumSubquery = data.projectId
        ? sql`(SELECT COALESCE(MAX(${apontamentos.numeroApontamento}), 0) + 1 FROM ${apontamentos} WHERE ${apontamentos.projectId} = ${data.projectId})`
        : sql`(SELECT COALESCE(MAX(${apontamentos.numeroApontamento}), 0) + 1 FROM ${apontamentos})`;

    const result = await db.insert(apontamentos).values({
        ...data,
        data: dataVerificacao,
        numeroApontamento: nextNumSubquery as any,
        createdAt: new Date(),
        updatedAt: new Date()
    }).returning();

    // =====================================================================
    // PARTE 2: Atualizar automaticamente a data de verificação da sala
    // Quando um apontamento é registrado, a sala correspondente é marcada
    // como verificada com a data do apontamento — sem precisar de ação manual.
    // =====================================================================
    try {
        // Busca a sala pelo nome, edificação e pavimento
        const salaAlvo = await db.select()
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
            // Atualiza a data de verificação apenas se ainda não foi preenchida
            // ou se a data do apontamento for mais recente
            const deveAtualizar = !sala.dataVerificada || dataVerificacao > sala.dataVerificada;

            if (deveAtualizar) {
                await db.update(salas)
                    .set({
                        dataVerificada: dataVerificacao,
                        status: 'VERIFICADA',
                        updatedAt: new Date()
                    })
                    .where(eq(salas.id, sala.id));
            }
        }
    } catch (syncError) {
        // Erro aqui não cancela o apontamento — apenas logamos para não afetar o usuário
        console.warn('[createApontamento] Falha ao sincronizar data de verificação da sala:', syncError);
    }

    return result;
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

export async function listProjects(ownerId: string, email?: string) {
    const db = await getDb();
    if (!db) return [];
    
    // Return projects where user is owner OR is a member by email
    const conditions = [eq(projects.ownerId, ownerId)];
    
    if (email) {
        conditions.push(exists(
            db.select().from(projectMembers)
              .where(and(
                  eq(projectMembers.projectId, projects.id),
                  eq(projectMembers.email, email)
              ))
        ));
    }
    
    return db.select().from(projects)
             .where(or(...conditions))
             .orderBy(desc(projects.createdAt));
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

export async function updateProject(id: string, data: Partial<Project>) {
    const db = await getDb();
    if (!db) return null;
    return await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
}

export async function updateProjectBaseline(id: string, baselineTargetDate: Date | null, baselineRoomsPerWeek: number | null) {
    const db = await getDb();
    if (!db) return null;
    return await db.update(projects)
        .set({ 
            baselineTargetDate, 
            baselineRoomsPerWeek, 
            updatedAt: new Date() 
        })
        .where(eq(projects.id, id))
        .returning();
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

export async function getAllVerificacoes(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select({ verificacaoModelo })
        .from(verificacaoModelo)
        .innerJoin(salas, eq(verificacaoModelo.salaId, salas.id))
        .where(eq(salas.projectId, projectId))
        .then((rows: any[]) => rows.map((r: any) => r.verificacaoModelo));
}

export async function upsertVerificacao(salaId: number, disciplina: string, status: string, observacao?: string | null, printUrl?: string | null) {
    const db = await getDb();
    if (!db) return null;

    const existing = await db.select().from(verificacaoModelo)
        .where(and(eq(verificacaoModelo.salaId, salaId), eq(verificacaoModelo.disciplina, disciplina)))
        .limit(1);

    if (existing.length > 0) {
        return await db.update(verificacaoModelo)
            .set({ status, observacao: observacao || null, printUrl: printUrl || null, updatedAt: new Date() })
            .where(eq(verificacaoModelo.id, existing[0].id))
            .returning();
    } else {
        return await db.insert(verificacaoModelo)
            .values({
                salaId,
                disciplina,
                status,
                observacao: observacao || null,
                printUrl: printUrl || null,
                updatedAt: new Date()
            })
            .returning();
    }
}

export async function updateApontamentoAsBuilt(id: number, asBuiltNota: string | null, asBuiltPrintUrl: string | null, bcfIssueId: string | null, status?: string) {
    const db = await getDb();
    if (!db) return null;

    const dataToUpdate: any = {
        asBuiltNota: asBuiltNota || null,
        asBuiltPrintUrl: asBuiltPrintUrl || null,
        bcfIssueId: bcfIssueId || null,
        updatedAt: new Date()
    };

    if (status) {
        dataToUpdate.status = status;
        if (status === 'RESOLVIDA') {
            dataToUpdate.dataResolvido = new Date();
        }
    }

    return await db.update(apontamentos)
        .set(dataToUpdate)
        .where(eq(apontamentos.id, id))
        .returning();
}

/**
 * Busca o histórico de relatórios gerados (Divergências)
 */
export async function getHistoricoRelatorios(projectId: string) {
    const db = await getDb();
    if (!db) return [];
    return db.select()
        .from(relatoriosDivergencia)
        .where(eq(relatoriosDivergencia.projectId, projectId))
        .orderBy(desc(relatoriosDivergencia.createdAt));
}

/**
 * Registra um novo relatório no histórico
 */
export async function registrarRelatorioDivergencia(projectId: string, data: any) {
    const db = await getDb();
    if (!db) return null;
    return await db.insert(relatoriosDivergencia)
        .values({
            ...data,
            projectId,
            createdAt: new Date()
        })
        .returning();
}

/**
 * Calcula estatísticas de qualidade por disciplina (Para a aba Gestão por Disciplina)
 */
export async function getStatsPorDisciplina(projectId: string, edificacao?: string) {
    const db = await getDb();
    if (!db) return [];

    // 1. Buscar todas as verificações do projeto
    const allVerificacoes = await db.select({ verificacaoModelo })
        .from(verificacaoModelo)
        .innerJoin(salas, eq(verificacaoModelo.salaId, salas.id))
        .where(eq(salas.projectId, projectId))
        .then((rows: any[]) => rows.map((r: any) => r.verificacaoModelo));
    
    // 2. Buscar todos os apontamentos ativos
    let apontamentosQuery = db.select().from(apontamentos).where(and(eq(apontamentos.projectId, projectId), eq(apontamentos.status, 'ATIVA')));
    if (edificacao && edificacao !== "Todas") {
        apontamentosQuery = apontamentosQuery.where(and(eq(apontamentos.projectId, projectId), eq(apontamentos.status, 'ATIVA'), eq(apontamentos.edificacao, edificacao)));
    }
    const allActiveApontamentos = await apontamentosQuery;

    // 3. Buscar total de salas
    let salasQuery = db.select().from(salas).where(eq(salas.projectId, projectId));
    if (edificacao && edificacao !== "Todas") {
        salasQuery = salasQuery.where(and(eq(salas.projectId, projectId), eq(salas.edificacao, edificacao)));
    }
    const allSalas = await salasQuery;
    const totalSalasCount = allSalas.length;

    // Agrupar por disciplina
    const statsMap: Record<string, any> = {};

    // Inicializar disciplinas conhecidas (ou extrair das existentes)
    const disciplinas = [...new Set(allVerificacoes.map((v: any) => v.disciplina))];
    
    // Se não houver verificações ainda, pegamos dos apontamentos ou usamos um padrão
    if (disciplinas.length === 0) {
        // Padrão do sistema
        ['Hidrossanitário', 'Elétrica', 'HVAC', 'Incêndio', 'Gás', 'Estrutura'].forEach(d => {
            statsMap[d] = {
                disciplina: d,
                totalRooms: totalSalasCount,
                okRooms: 0,
                roomsComDivergencia: 0,
                percentOk: 0
            };
        });
    } else {
        disciplinas.forEach((d: any) => {
            statsMap[d as string] = {
                disciplina: d as string,
                totalRooms: totalSalasCount,
                okRooms: 0,
                roomsComDivergencia: 0,
                percentOk: 0
            };
        });
    }

    // Contar OKs
    allVerificacoes.forEach((v: any) => {
        if (statsMap[v.disciplina] && v.status === 'OK') {
            statsMap[v.disciplina].okRooms++;
        }
    });

    // Contar Divergências (Salas únicas por disciplina que possuem apontamentos ativos)
    const salasComDivergenciaPorDisc: Record<string, Set<string>> = {};
    allActiveApontamentos.forEach((a: any) => {
        if (!salasComDivergenciaPorDisc[a.disciplina]) {
            salasComDivergenciaPorDisc[a.disciplina] = new Set();
        }
        salasComDivergenciaPorDisc[a.disciplina].add(a.sala);
    });

    Object.keys(salasComDivergenciaPorDisc).forEach(disc => {
        if (statsMap[disc]) {
            statsMap[disc].roomsComDivergencia = salasComDivergenciaPorDisc[disc].size;
        }
    });

    // Calcular percentuais
    return Object.values(statsMap).map((s: any) => ({
        ...s,
        percentOk: s.totalRooms > 0 ? (s.okRooms / s.totalRooms) * 100 : 0
    }));
}
