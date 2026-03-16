import "dotenv/config";
import postgres from "postgres";
import fs from "fs";
import path from "path";

async function migrate() {
    const client = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });
    try {
        console.log("Reading migration file...");
        const migrationPath = "D:/STECLA IA/Dashboard-AsBuilt-Custom/drizzle/migrations/0004_typical_hellcat.sql";
        const sql = fs.readFileSync(migrationPath, "utf-8");
        
        console.log("Applying migration...");
        // Drizzle migrations often contain multiple statements. 
        // Simple postgres-js doesn't support multiple statements in one tagged template easily if they are separated by ;
        // But we can try to split them if needed or just run as is if the driver supports it.
        await client.unsafe(sql);
        console.log("Migration applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

migrate();
