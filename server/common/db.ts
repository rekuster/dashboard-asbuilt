import "dotenv/config";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";

export * from "../../drizzle/schema";

let _db: ReturnType<typeof drizzlePg<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
    if (!_db) {
        try {
            if (process.env.DATABASE_URL) {
                _client = postgres(process.env.DATABASE_URL, {
                    ssl: { rejectUnauthorized: false },
                    max: 3, // Safe pool size for Supabase
                    prepare: false,
                    connect_timeout: 10,
                });
                _db = drizzlePg(_client, { schema });
            } else {
                console.warn("[Database] DATABASE_URL is missing! Queries will fail.");
                return null;
            }
        } catch (error) {
            console.error("[Database] Failed to connect:", error);
            _db = null;
        }
    }
    return _db;
}

export async function closeDb() {
    if (_client) {
        await _client.end();
        _client = null;
        _db = null;
    }
}
