import "dotenv/config";
import { getDb, salas, apontamentos } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function monitor() {
    const db = await getDb();
    if (!db) { console.error("No DB"); return; }

    try {
        const rSalas = await db.select({ count: sql<number>`count(*)` }).from(salas);
        const rApt = await db.select({ count: sql<number>`count(*)` }).from(apontamentos);

        console.log(`📊 Current DB Stats:
        - Salas: ${rSalas[0].count}
        - Apontamentos: ${rApt[0].count}`);
    } catch (e) {
        console.error("Monitor error:", e);
    }
    process.exit(0);
}
monitor();
