
import "dotenv/config";
import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function applyMigrations() {
    const db = await getDb();
    if (!db) {
        console.error("❌ Could not connect to DB");
        return;
    }

    console.log("🛠️ Adding columns to escopoAsBuilt...");
    try {
        // Using sql.raw for schema modifications
        await db.execute(sql.raw('ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "temRvtOriginal" integer DEFAULT 0'));
        await db.execute(sql.raw('ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "pendenciaRvt" text'));
        console.log("✅ Columns added successfully");
    } catch (e) {
        console.error("❌ Error adding columns:", e);
    }
}

applyMigrations().then(() => process.exit(0));
