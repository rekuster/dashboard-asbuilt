import { getDb, escopoAsBuilt, entregasAsBuilt, salas, apontamentos } from "../db";
import { eq, sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        return;
    }

    console.log("--- AS-BUILT DATA VERIFICATION ---");

    // 1. Escopo Models
    const escopos = await db.select().from(escopoAsBuilt);
    console.log(`Total Models in Escopo: ${escopos.length}`);
    const comRvt = escopos.filter((e: any) => e.temRvtOriginal === 1).length;
    console.log(`Models with Native RVT (temRvtOriginal=1): ${comRvt}`);
    
    // 2. Entregas
    const entregas = await db.select().from(entregasAsBuilt);
    console.log(`Total 1ntregas registered: ${entregas.length}`);
    const validados = entregas.filter((e: any) => e.status === 'VALIDADO');
    console.log(`Validated Entregas: ${validados.length}`);
    
    const uniqueValidatedEscopos = new Set(validados.map((e: any) => e.escopoId));
    console.log(`Unique Models Covered (Validated): ${uniqueValidatedEscopos.size}`);
    
    const coveragePercent = escopos.length > 0 ? (uniqueValidatedEscopos.size / escopos.length) * 100 : 0;
    console.log(`Current Coverage Percentage: ${coveragePercent.toFixed(2)}%`);

    // 3. Rooms and Discrepancies
    const totalSalas = await db.select().from(salas);
    console.log(`Total Rooms in Master List: ${totalSalas.length}`);
    
    const totalApontamentos = await db.select().from(apontamentos);
    const pendingApontamentos = totalApontamentos.filter((a: any) => a.status === 'PENDENTE').length;
    console.log(`Total Discrepancies (Apontamentos): ${totalApontamentos.length}`);
    console.log(`Pending Discrepancies: ${pendingApontamentos}`);

    console.log("----------------------------------");
}

main().catch(console.error);
