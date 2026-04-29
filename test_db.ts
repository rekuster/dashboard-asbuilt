
import { getStatsPorDisciplina, getDb, closeDb } from './server/db';

async function test() {
    try {
        console.log("Testing getStatsPorDisciplina...");
        const stats = await getStatsPorDisciplina();
        console.log("Stats result:", JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error("Error during test:", error);
    } finally {
        await closeDb();
    }
}

test();
