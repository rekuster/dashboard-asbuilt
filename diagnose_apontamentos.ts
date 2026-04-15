import { getDb, apontamentos, escopoAsBuilt } from "./server/db";
import { count, eq } from "drizzle-orm";

async function diagnose() {
    try {
        const db = await getDb();
        if (!db) {
            console.error("Erro ao conectar ao banco de dados.");
            process.exit(1);
        }
        
        console.log("=== DIAGNÓSTICO DE APONTAMENTOS ===");
        
        // 1. Total de apontamentos e status
        const allApontamentos = await db.select().from(apontamentos);
        console.log(`Total de apontamentos: ${allApontamentos.length}`);
        
        const statuses: Record<string, number> = {};
        allApontamentos.forEach(a => {
            statuses[a.status] = (statuses[a.status] || 0) + 1;
        });
        console.log("Status dos apontamentos:", statuses);
        
        // 2. Disciplinas nos apontamentos
        const discApontamentos = Array.from(new Set(allApontamentos.map(a => a.disciplina)));
        console.log("Disciplinas nos apontamentos:", discApontamentos);
        
        // 3. Disciplinas no escopo
        const allEscopos = await db.select().from(escopoAsBuilt);
        const discEscopos = Array.from(new Set(allEscopos.map(e => e.disciplina)));
        console.log("Disciplinas no escopo as-built:", discEscopos);
        
        // 4. Cruzamento com Escopo
        const missingInEscopo = discApontamentos.filter(d => !discEscopos.includes(d));
        console.log("Disciplinas com apontamentos mas SEM escopo:", missingInEscopo);

        // 5. Verificação por Edificação
        console.log("\n=== VERIFICAÇÃO POR EDIFICAÇÃO ===");
        const uniqueEdifsApont = Array.from(new Set(allApontamentos.map(a => a.edificacao)));
        const uniqueEdifsEscopo = Array.from(new Set(allEscopos.map(e => e.edificacao)));
        console.log("Edificações nos apontamentos:", uniqueEdifsApont);
        console.log("Edificações no escopo:", uniqueEdifsEscopo);

    } catch (error) {
        console.error("Erro durante o diagnóstico:", error);
    }
    process.exit(0);
}

diagnose();
