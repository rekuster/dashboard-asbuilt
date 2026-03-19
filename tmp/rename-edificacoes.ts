import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function renameEdificacoes() {
    try {
        console.log("Renomeando na tabela salas...");
        await sql`UPDATE salas SET edificacao = 'Prédio Produção' WHERE edificacao = 'Produção'`;
        await sql`UPDATE salas SET edificacao = 'Prédio Suporte' WHERE edificacao = 'Suporte'`;
        await sql`UPDATE salas SET edificacao = 'Central de Utilidades' WHERE edificacao = 'Central Utilidades'`;

        console.log("Renomeando na tabela apontamentos...");
        await sql`UPDATE apontamentos SET edificacao = 'Prédio Produção' WHERE edificacao = 'Produção'`;
        await sql`UPDATE apontamentos SET edificacao = 'Prédio Suporte' WHERE edificacao = 'Suporte'`;
        await sql`UPDATE apontamentos SET edificacao = 'Central de Utilidades' WHERE edificacao = 'Central Utilidades'`;

        console.log("Renomeação concluída com sucesso!");
    } catch (e) {
        console.error("Erro:", e);
    } finally {
        await sql.end();
    }
}

renameEdificacoes();
