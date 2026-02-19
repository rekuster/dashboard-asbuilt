import "dotenv/config";
import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function resetDb() {
    console.log("🔥 Resetting Database...");
    const db = await getDb();
    if (!db) {
        console.error("❌ No DB connection");
        process.exit(1);
    }

    try {
        // Drop tables in correct order (child tables first)
        console.log("🗑️ Dropping 'entregasHistorico'...");
        await db.execute(sql`DROP TABLE IF EXISTS "entregasHistorico" CASCADE`);

        console.log("🗑️ Dropping 'entregasAsBuilt'...");
        await db.execute(sql`DROP TABLE IF EXISTS "entregasAsBuilt" CASCADE`);

        console.log("🗑️ Dropping 'apontamentos'...");
        await db.execute(sql`DROP TABLE IF EXISTS "apontamentos" CASCADE`);

        console.log("🗑️ Dropping 'files' / 'ifcFiles'...");
        await db.execute(sql`DROP TABLE IF EXISTS "ifcFiles" CASCADE`);

        console.log("🗑️ Dropping 'uploads'...");
        await db.execute(sql`DROP TABLE IF EXISTS "uploads" CASCADE`);

        console.log("🗑️ Dropping 'salas'...");
        await db.execute(sql`DROP TABLE IF EXISTS "salas" CASCADE`);

        console.log("🗑️ Dropping 'users'...");
        await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE`);

        console.log("✅ Database reset complete.");
    } catch (e) {
        console.error("❌ Reset failed:", e);
    }
    process.exit(0);
}

resetDb();
