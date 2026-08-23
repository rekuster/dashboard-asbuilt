import "dotenv/config";
import postgres from "postgres";

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL is missing");
        return;
    }

    const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

    console.log("Applying DB migrations...");

    await sql`
        ALTER TABLE "projectMembers" 
        ADD COLUMN IF NOT EXISTS "empresa" text;
    `;
    console.log("Added column empresa to projectMembers");

    await sql`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "avatarUrl" text;
    `;
    console.log("Added column avatarUrl to users");

    console.log("Migration completed successfully!");
    await sql.end();
}

main().catch((err) => {
    console.error("Migration error:", err);
});
