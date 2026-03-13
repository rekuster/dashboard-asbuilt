import { getDb, entregasAsBuilt } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    if (!db) return;
    await db.delete(entregasAsBuilt).where(sql`"nomeDocumento" = 'Mock Integration Test'`);
    console.log("Cleanup complete");
}

main().catch(console.error);
