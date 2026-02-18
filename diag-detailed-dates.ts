import { getDb, salas } from "./server/db";
import { sql } from "drizzle-orm";

async function diag() {
    const db = await getDb();
    if (!db) return;

    console.log("--- Detalhamento Cronograma (Salas com Data) ---");
    const result = await db.select({
        nome: salas.nome,
        data: salas.dataVerificada,
        edificacao: salas.edificacao
    }).from(salas).where(sql`${salas.dataVerificada} IS NOT NULL`);

    result.forEach(r => {
        console.log(`Sala: ${r.nome} | Date: ${r.data?.toISOString()} | Edif: ${r.edificacao}`);
    });

    process.exit(0);
}

diag().catch(console.error);
