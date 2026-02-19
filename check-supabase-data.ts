import "dotenv/config";
import postgres from "postgres";

async function check() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("❌ No DATABASE_URL found in .env");
        return;
    }

    console.log("Checking Supabase connection...");
    console.log("URL:", url.replace(/:[^:]+@/, ":***@")); // Hide password in logs

    try {
        const sql = postgres(url, { ssl: 'require', max: 1 });

        const rUsers = await sql`select count(*) from users`;
        const rSalas = await sql`select count(*) from salas`;
        const rApt = await sql`select count(*) from apontamentos`;

        console.log("✅ Connection Successful!");
        console.log("--- Data Counts ---");
        console.log(`Users: ${rUsers[0].count}`);
        console.log(`Salas: ${rSalas[0].count}`);
        console.log(`Apontamentos: ${rApt[0].count}`);

        await sql.end();
    } catch (e) {
        console.error("❌ Connection Failed:", e);
    }
}

check();
