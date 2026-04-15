
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
}

async function test() {
    console.log('Connecting to:', url.split('@')[1]);
    const client = postgres(url);
    const db = drizzle(client);
    try {
        const result = await client`SELECT 1`;
        console.log('✅ Connection OK:', result);
    } catch (e) {
        console.error('❌ Connection Failed:', e);
    } finally {
        await client.end();
    }
}

test();
