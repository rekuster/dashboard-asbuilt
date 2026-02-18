import { getDb, salas } from "./server/db";
import { sql } from "drizzle-orm";

async function diag() {
    const db = await getDb();
    if (!db) return;

    console.log("--- Diagnóstico Amplo (Jan 2026) ---");
    const result = await db.select({
        nome: salas.nome,
        dataVerificada: salas.dataVerificada,
        updatedAt: salas.updatedAt,
        status: salas.status
    }).from(salas).where(sql`"dataVerificada" >= '2026-01-01' OR "updatedAt" >= '2026-01-01'`);

    result.forEach(r => {
        console.log(`Sala: ${r.nome} | Verified: ${r.dataVerificada?.toISOString() || 'NULL'} | Updated: ${r.updatedAt?.toISOString()} | Status: ${r.status}`);
    });

    process.exit(0);
}

diag().catch(console.error);
