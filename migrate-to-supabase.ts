import "dotenv/config";
import { getDb, salas, apontamentos, users, ifcFiles, uploads, entregasAsBuilt, entregasHistorico } from "./server/db.ts";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";

// Helper to get actual columns from a table
function getTableColumns(db: any, tableName: string): string[] {
    try {
        const info = db.pragma(`table_info(${tableName})`);
        return info.map((c: any) => c.name);
    } catch (e) {
        console.warn(`Could not get info for table ${tableName}`, e);
        return [];
    }
}

async function migrate() {
    console.log("🚀 Iniciando migração ADAPTATIVA SQLite -> Supabase...");

    const sqlite = new Database("sqlite.db");

    // Connect to Supabase
    const dbPg = await getDb();
    if (!dbPg) {
        console.error("❌ Erro: Não foi possível conectar ao banco Postgres (Supabase).");
        return;
    }

    try {
        // --- USERS ---
        console.log("👥 Migrando usuários...");
        const userCols = getTableColumns(sqlite, "users");
        if (userCols.length > 0) {
            const localUsers = sqlite.prepare(`SELECT ${userCols.join(", ")} FROM users`).all();
            if (localUsers.length > 0) {
                await dbPg.insert(users).values(localUsers).onConflictDoUpdate({
                    target: users.id,
                    set: {
                        name: sql.raw('excluded.name'),
                        email: sql.raw('excluded.email'),
                        role: sql.raw('excluded.role'),
                        lastSignedIn: sql.raw('excluded."lastSignedIn"'),
                        updatedAt: new Date()
                    }
                });
            }
        }

        // --- SALAS ---
        console.log("🏢 Migrando salas...");
        const salaCols = getTableColumns(sqlite, "salas");
        // Filter out columns that might not map 1:1 if needed, but usually we just want what exists
        if (salaCols.length > 0) {
            const localSalas = sqlite.prepare(`SELECT ${salaCols.join(", ")} FROM salas`).all();
            console.log(`   Encontradas ${localSalas.length} salas com colunas: ${salaCols.join(", ")}`);

            if (localSalas.length > 0) {
                // Construct the set object for update manually or use excluded
                // We need to be careful: if a column is missing locally, we shouldn't try to set it to excluded.col because excluded.col might be null or undefined? 
                // Actually excluded.col refers to the value we TRIED to insert. 
                // If we didn't provide it in the insert values (because it's missing locally), it will be DEFAULT or NULL.
                // So excluded.col will be NULL. If we set col = excluded.col, we overwrite with NULL.
                // We want to overwrite ONLY if we actually have data.

                // Strategy: We want to update existing rows with local data. 
                // If local data is missing a column (e.g. dataVerificacao2), we should NOT update that column in PG?
                // Or does missing locally mean it truly is null/empty? 
                // User said "outdated data", implying local is the source of truth. 
                // But if local schema is OLDER, it might be missing new columns.
                // If we overwrite new columns in PG with NULL from "missing local column", we might lose data if PG had it?
                // But PG was "empty" or "outdated". 
                // Let's assume we want to sync what we have.

                const updateSet: any = { updatedAt: new Date() };
                const pgColumns = [
                    'edificacao', 'pavimento', 'setor', 'nome', 'numeroSala', 'augin',
                    'status', 'statusRA', 'dataVerificada', 'faltouDisciplina', 'revisar',
                    'obs', 'dataVerificacao2', 'obs2', 'trackerPosicionado', 'plantaImpressa',
                    'qrCodePlastificado', 'ifcExpressId'
                ];

                pgColumns.forEach(col => {
                    if (salaCols.includes(col)) {
                        updateSet[col] = sql.raw(`excluded."${col}"`);
                    }
                });

                await dbPg.insert(salas).values(localSalas).onConflictDoUpdate({
                    target: salas.id,
                    set: updateSet
                });
            }
        }

        // --- APONTAMENTOS ---
        console.log("⚠️ Migrando apontamentos...");
        const aptCols = getTableColumns(sqlite, "apontamentos");
        if (aptCols.length > 0) {
            const localApontamentos = sqlite.prepare(`SELECT ${aptCols.join(", ")} FROM apontamentos`).all();
            if (localApontamentos.length > 0) {
                const updateSet: any = { updatedAt: new Date() };
                const pgColumns = [
                    'numeroApontamento', 'data', 'edificacao', 'pavimento', 'setor', 'sala',
                    'disciplina', 'divergencia', 'fotoUrl', 'fotoReferenciaUrl', 'status', 'responsavel'
                ];
                pgColumns.forEach(col => {
                    if (aptCols.includes(col)) {
                        updateSet[col] = sql.raw(`excluded."${col}"`);
                    }
                });

                await dbPg.insert(apontamentos).values(localApontamentos).onConflictDoUpdate({
                    target: apontamentos.id,
                    set: updateSet
                });
            }
        }

        // --- ENTREGAS ---
        console.log("📦 Migrando entregas...");
        const entCols = getTableColumns(sqlite, "entregasAsBuilt");
        if (entCols.length > 0) {
            const localEntregas = sqlite.prepare(`SELECT ${entCols.join(", ")} FROM entregasAsBuilt`).all();
            if (localEntregas.length > 0) {
                const updateSet: any = { updatedAt: new Date() };
                const pgColumns = ['nomeDocumento', 'tipoDocumento', 'edificacao', 'disciplina', 'empresaResponsavel', 'dataPrevista', 'dataRecebimento', 'status', 'descricao'];
                pgColumns.forEach(col => {
                    if (entCols.includes(col)) updateSet[col] = sql.raw(`excluded."${col}"`);
                });
                await dbPg.insert(entregasAsBuilt).values(localEntregas).onConflictDoUpdate({
                    target: entregasAsBuilt.id,
                    set: updateSet
                });
            }
        }

        // --- IFC FILES ---
        console.log("🏗️ Migrando IFC Files...");
        const ifcCols = getTableColumns(sqlite, "ifcFiles");
        if (ifcCols.length > 0) {
            const localIfc = sqlite.prepare(`SELECT ${ifcCols.join(", ")} FROM ifcFiles`).all();
            if (localIfc.length > 0) {
                const updateSet: any = {};
                const pgColumns = ['fileName', 'filePath', 'edificacao', 'fileSize', 'uploadedBy'];
                pgColumns.forEach(col => {
                    if (ifcCols.includes(col)) updateSet[col] = sql.raw(`excluded."${col}"`);
                });
                await dbPg.insert(ifcFiles).values(localIfc).onConflictDoUpdate({
                    target: ifcFiles.id,
                    set: updateSet
                });
            }
        }

        console.log("✅ Migração adaptativa concluída!");

    } catch (error) {
        console.error("❌ Erro fatal:", error);
    } finally {
        sqlite.close();
        process.exit(0);
    }
}

migrate();
