import { getDb } from './server/db.js';
import { salas } from './drizzle/schema.js';

async function check() {
    try {
        const db = await getDb();
        if (!db) {
            console.error('Database not initialized');
            process.exit(1);
        }
        const results = await db.select().from(salas).limit(20);
        console.log('--- Salas DB Check ---');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('ERROR during check:', e);
        process.exit(1);
    }
}

check();
