
import { getDb, salas, escopoAsBuilt } from './server/db';

async function checkData() {
    const db = await getDb();
    if (!db) {
        console.error("Could not connect to database");
        return;
    }

    const salasCount = await db.select().from(salas);
    const escoposCount = await db.select().from(escopoAsBuilt);

    console.log(`Salas: ${salasCount.length}`);
    console.log(`Escopos (Lista Mestra): ${escoposCount.length}`);
    
    if (salasCount.length > 0) {
        console.log("Exemplo de Sala:", JSON.stringify(salasCount[0], null, 2));
    }
}

checkData().catch(console.error);
