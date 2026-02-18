import { getDb, salas } from "./server/db";
import { sql } from "drizzle-orm";

async function diag() {
    const db = await getDb();
    if (!db) {
        console.log("Failed to connect to DB");
        return;
    }

    console.log("--- Diagnóstico de Salas Verificadas ---");
    const result = await db.select({
        id: salas.id,
        nome: salas.nome,
        dataVerificada: salas.dataVerificada,
        status: salas.status,
        edificacao: salas.edificacao
    }).from(salas).where(sql`${salas.dataVerificada} IS NOT NULL`).limit(10);

    console.log(`Encontradas ${result.length} salas com dataVerificada (amostra de 10):`);
    result.forEach(s => {
        console.log(`ID: ${s.id} | Sala: ${s.nome} | Data: ${s.dataVerificada?.toISOString() || 'NULL'} | Status: ${s.status} | Edif: ${s.edificacao}`);
    });

    const total = await db.select({ count: sql<number>`count(*)` }).from(salas).where(sql`${salas.dataVerificada} IS NOT NULL`);
    console.log(`Total geral com dataVerificada: ${total[0].count}`);

    process.exit(0);
}

diag().catch(console.error);
