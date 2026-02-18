import "dotenv/config";
import { getDb, salas } from "./server/db";
import { sql } from "drizzle-orm";

async function testConnection() {
    console.log("--- Diagnóstico de Banco de Dados ---");
    try {
        const db = await getDb();
        if (!db) {
            console.error("ERRO: Não foi possível obter instância do banco.");
            return;
        }

        console.log("Conectado! Verificando tabelas...");

        // Check if we can select from salas
        const result = await db.select({ count: sql`count(*)` }).from(salas);
        console.log(`Sucesso! Total de salas no banco: ${result[0].count}`);

        console.log("--- Fim do Diagnóstico ---");
    } catch (e) {
        console.error("ERRO CRÍTICO NO TESTE:", e);
    }
}

testConnection();
