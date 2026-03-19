import { getDb } from "../server/db";
import { apontamentos, salas } from "../server/_core/index";
import { eq, like } from "drizzle-orm";

async function run() {
    const db = await getDb();
    if (!db) return;
    
    // Find rooms with Afiação
    const afiacaoSalas = await db.select().from(salas).where(like(salas.nome, "%Afia%"));
    console.log("Salas encontradas com Afia:");
    console.log(afiacaoSalas.map(s => ({ id: s.id, nome: s.nome, edificacao: s.edificacao })));
    
    // Find apontamentos with Afiação
    const afiacaoApontamentos = await db.select().from(apontamentos).where(like(apontamentos.sala, "%Afia%"));
    console.log("\nApontamentos encontrados com Afia:");
    console.log(afiacaoApontamentos.map(a => ({ id: a.id, sala: a.sala, edificacao: a.edificacao })));
}

run().catch(console.error).finally(() => process.exit(0));
