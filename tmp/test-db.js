import "dotenv/config";
import postgres from "postgres";

async function test() {
    console.log("Testing connection...");
    const client = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });
    try {
        const result = await client`SELECT 1 as test`;
        console.log("Connection OK:", result);
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        await client.end();
    }
}

test();
