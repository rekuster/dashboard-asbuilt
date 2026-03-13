
import "dotenv/config";
import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function runMigration() {
    const db = await getDb();
    if (!db) {
        console.error("❌ Could not connect to DB");
        return;
    }

    console.log("🛠️ Creating table verificacaoModelo...");
    try {
        await db.execute(sql.raw(`
            CREATE TABLE IF NOT EXISTS "verificacaoModelo" (
                "id" SERIAL PRIMARY KEY,
                "salaId" INTEGER NOT NULL REFERENCES "salas"("id") ON DELETE CASCADE,
                "disciplina" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDENTE',
                "observacao" TEXT,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `));
        console.log("✅ Table created successfully");
    } catch (e) {
        console.error("❌ Error creating table:", e);
    }
}

runMigration().then(() => process.exit(0));
