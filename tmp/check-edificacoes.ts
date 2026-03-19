import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function checkEdificacoes() {
    const salasInfo = await sql`
        SELECT edificacao, count(*) as qty
        FROM salas
        GROUP BY edificacao
        ORDER BY edificacao
    `;
    console.log("Salas por edificação:", salasInfo);

    const apontamentosInfo = await sql`
        SELECT edificacao, count(*) as qty
        FROM apontamentos
        GROUP BY edificacao
        ORDER BY edificacao
    `;
    console.log("Apontamentos por edificação:", apontamentosInfo);

    await sql.end();
}

checkEdificacoes();
