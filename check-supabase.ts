import "dotenv/config";
import { getDb, salas, apontamentos, users } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function check() {
    console.log("🔍 Checking Supabase data...");
    const db = await getDb();
    if (!db) {
        console.error("❌ Not connected.");
        return;
    }

    const s = await db.select({ count: sql`count(*)` }).from(salas);
    const a = await db.select({ count: sql`count(*)` }).from(apontamentos);
    const u = await db.select({ count: sql`count(*)` }).from(users);

    console.log(`✅ Salas: ${s[0].count}`);
    console.log(`✅ Apontamentos: ${a[0].count}`);
    console.log(`✅ Users: ${u[0].count}`);
    process.exit(0);
}

check();
