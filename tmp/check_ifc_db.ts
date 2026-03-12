import "dotenv/config";
import postgres from "postgres";

async function checkDb() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not found");
        return;
    }

    const sql = postgres(url);
    console.log("Checking ifcFiles table...");
    try {
        const res = await sql`SELECT count(*) FROM "ifcFiles"`;
        console.log("IFC files count:", res[0].count);
        
        const rows = await sql`SELECT * FROM "ifcFiles"`;
        console.log("Models found:", rows);
    } catch (e) {
        console.error("Error querying ifcFiles:", e);
        
        // Let's also check if the table exists by listing all tables
        try {
            const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
            console.log("Public tables:", tables.map(t => t.table_name));
        } catch (inner) {
            console.error("Error listing tables:", inner);
        }
    }
    await sql.end();
}

checkDb();
