import { getDb, salas } from "./server/db";
import { eq } from "drizzle-orm";

async function diag() {
    const db = await getDb();
    if (!db) return;

    console.log("--- Verificação Específica de Salas (Jan 2026) ---");

    const nomesProcurados = ["Escritório Microbiologia", "Circulação Microbiologia"];

    for (const nome of nomesProcurados) {
        const result = await db.select().from(salas).where(eq(salas.nome, nome));
        if (result.length > 0) {
            const r = result[0];
            console.log(`Sala: ${r.nome}`);
            console.log(` - Data Verificada: ${r.dataVerificada?.toISOString() || 'NULL'}`);
            console.log(` - Status: ${r.status}`);
            console.log(` - Edificacao: ${r.edificacao}`);
        } else {
            console.log(`Sala: ${nome} NÃO ENCONTRADA no banco!`);
        }
    }

    process.exit(0);
}

diag().catch(console.error);
