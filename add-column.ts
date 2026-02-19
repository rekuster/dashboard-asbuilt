
import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log("Starting migration: Add imagemPlantaUrl to salas...");
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        process.exit(1);
    }

    try {
        await db.execute(sql`ALTER TABLE salas ADD COLUMN IF NOT EXISTS "imagemPlantaUrl" text;`);
        console.log("Migration successful: imagemPlantaUrl column added.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
    process.exit(0);
}

migrate();
