import "dotenv/config";
import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function checkSchema() {
    console.log("🔍 Checking Database Schema...");
    const db = await getDb();
    if (!db) {
        console.error("❌ No DB connection");
        return;
    }

    try {
        // List tables
        const tables = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log("\n📋 Tables found:");
        tables.forEach((t: any) => console.log(` - ${t.table_name}`));

        // Check columns for 'apontamentos'
        const columns = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'apontamentos'
        `);

        console.log("\n📋 Columns in 'apontamentos':");
        columns.forEach((c: any) => console.log(` - ${c.column_name} (${c.data_type})`));

    } catch (e) {
        console.error("❌ Schema check failed:", e);
    }
    process.exit(0);
}

checkSchema();
