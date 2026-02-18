import "dotenv/config";
import { getDb, salas, apontamentos, users, ifcFiles, uploads, entregasAsBuilt, entregasHistorico } from "./server/db.ts";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as sqliteSchema from "./drizzle/schema.ts";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("🚀 Iniciando migração SQLite -> Supabase...");

    const sqlite = new Database("sqlite.db");
    const dbSqlite = drizzleSqlite(sqlite, { schema: sqliteSchema });

    const dbPg = await getDb();
    if (!dbPg) {
        console.error("❌ Erro: Não foi possível conectar ao banco Postgres (Supabase). Verifique o DATABASE_URL no .env");
        return;
    }

    try {
        // Migrar Usuários
        console.log("👥 Migrando usuários...");
        const localUsers = await dbSqlite.select().from(sqliteSchema.users);
        if (localUsers.length > 0) {
            await dbPg.insert(users).values(localUsers).onConflictDoNothing();
        }

        // Migrar Salas
        console.log("🏢 Migrando salas...");
        const localSalas = await dbSqlite.select().from(sqliteSchema.salas);
        if (localSalas.length > 0) {
            await dbPg.insert(salas).values(localSalas).onConflictDoNothing();
        }

        // Migrar Apontamentos
        console.log("⚠️ Migrando apontamentos...");
        const localApontamentos = await dbSqlite.select().from(sqliteSchema.apontamentos);
        if (localApontamentos.length > 0) {
            await dbPg.insert(apontamentos).values(localApontamentos).onConflictDoNothing();
        }

        // Migrar Entregas
        console.log("📦 Migrando entregas as-built...");
        const localEntregas = await dbSqlite.select().from(sqliteSchema.entregasAsBuilt);
        if (localEntregas.length > 0) {
            await dbPg.insert(entregasAsBuilt).values(localEntregas).onConflictDoNothing();
        }

        // Migrar Histórico de Entregas
        console.log("📜 Migrando histórico de entregas...");
        const localHistorico = await dbSqlite.select().from(sqliteSchema.entregasHistorico);
        if (localHistorico.length > 0) {
            await dbPg.insert(entregasHistorico).values(localHistorico).onConflictDoNothing();
        }

        // Migrar IFC Files
        console.log("🏗️ Migrando registros de arquivos IFC...");
        const localIfc = await dbSqlite.select().from(sqliteSchema.ifcFiles);
        if (localIfc.length > 0) {
            await dbPg.insert(ifcFiles).values(localIfc).onConflictDoNothing();
        }

        console.log("✅ Migração concluída com sucesso!");
    } catch (error) {
        console.error("❌ Erro durante a migração:", error);
    } finally {
        sqlite.close();
    }
}

migrate();
