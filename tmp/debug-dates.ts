import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function debugDatas() {
    const salas = await sql`
        SELECT id, nome, "dataVerificada"
        FROM salas
        WHERE edificacao = 'Prédio Produção' AND "dataVerificada" IS NOT NULL
        ORDER BY "dataVerificada" ASC
    `;
    console.log("Salas Verificadas em Prédio Produção:", salas);

    const calc = {
        total: 142,
        verificadas: salas.length,
        minDate: new Date(salas[0]?.dataVerificada),
        maxDate: new Date(salas[salas.length - 1]?.dataVerificada),
    }

    const diasDecorridos = Math.max(1, (calc.maxDate.getTime() - calc.minDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log("Dias decorridos:", diasDecorridos);
    
    const velocidade = calc.verificadas / diasDecorridos;
    console.log("Velocidade (salas/dia):", velocidade);

    const restantes = calc.total - calc.verificadas;
    const diasRestantes = restantes / velocidade;
    
    const dateTermino = new Date(calc.maxDate.getTime() + (diasRestantes * 1000 * 60 * 60 * 24));
    console.log("Data Término (UTC):", dateTermino.toISOString());

    await sql.end();
}

debugDatas();
