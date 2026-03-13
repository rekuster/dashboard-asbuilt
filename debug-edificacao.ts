
import { getDb, salas, escopoAsBuilt } from "./server/db";

async function debugData() {
    const db = await getDb();
    if (!db) {
        console.error("Database not connected");
        return;
    }

    const allSalasNames = await db.select({ edificacao: salas.edificacao }).from(salas);
    const allEscoposNames = await db.select({ edificacao: escopoAsBuilt.edificacao }).from(escopoAsBuilt);

    const uniqueEdSalas = [...new Set(allSalasNames.map(s => s.edificacao))].sort();
    const uniqueEdEscopo = [...new Set(allEscoposNames.map(e => e.edificacao))].sort();

    console.log("--- UNIQUE EDIFICACOES IN SALAS ---");
    uniqueEdSalas.forEach(e => console.log(`"${e}"`));

    console.log("\n--- UNIQUE EDIFICACOES IN ESCOPO ---");
    uniqueEdEscopo.forEach(e => console.log(`"${e}"`));
}

debugData().catch(console.error);
