import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function checkDateBoundaries() {
    const res = await sql`
        SELECT 
            MIN("dataVerificada") as min_date,
            MAX("dataVerificada") as max_date,
            COUNT(*) as count
        FROM salas
        WHERE edificacao = 'Prédio Produção' AND "dataVerificada" IS NOT NULL
    `;
    console.log("Resultados:", res);
    
    // Also let's check what the Math.min and max values are in Javascript
    const allSalas = await sql`
        SELECT "dataVerificada" FROM salas
        WHERE edificacao = 'Prédio Produção' AND "dataVerificada" IS NOT NULL
    `;
    const datas = allSalas.map(s => new Date(s.dataVerificada).getTime());
    const minD = Math.min(...datas);
    const maxD = Math.max(...datas);
    const diffDays = (maxD - minD) / (1000 * 60 * 60 * 24);
    
    console.log("Min date JS:", new Date(minD).toISOString());
    console.log("Max date JS:", new Date(maxD).toISOString());
    console.log("Diff days:", diffDays);

    await sql.end();
}

checkDateBoundaries();
