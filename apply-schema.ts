/**
 * Direct SQL migration: Apply new schema changes for multi-project support.
 * Creates projects/projectMembers tables and adds projectId columns.
 * Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXIST checks).
 * 
 * Run: npx tsx apply-schema.ts
 */
import "dotenv/config";
import postgres from "postgres";

async function applySchema() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.error("❌ DATABASE_URL not set");
        process.exit(1);
    }

    const sql = postgres(DATABASE_URL, {
        ssl: { rejectUnauthorized: false },
        max: 1,
        prepare: false,
    });

    console.log("🔄 Applying schema changes...\n");

    try {
        // 1. Enable uuid-ossp extension (for gen_random_uuid)
        await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
        console.log("✅ pgcrypto extension ready");

        // 2. Create projects table
        await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS "projects" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "code" TEXT NOT NULL UNIQUE,
                "name" TEXT NOT NULL,
                "description" TEXT,
                "client" TEXT,
                "location" TEXT,
                "ownerId" TEXT NOT NULL,
                "startDate" TIMESTAMP,
                "endDate" TIMESTAMP,
                "imageUrl" TEXT,
                "status" TEXT NOT NULL DEFAULT 'ativo',
                "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        console.log("✅ Table 'projects' ready");

        // 3. Create projectMembers table
        await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS "projectMembers" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "projectId" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
                "userId" TEXT NOT NULL,
                "email" TEXT NOT NULL,
                "role" TEXT NOT NULL DEFAULT 'viewer',
                "invitedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                "acceptedAt" TIMESTAMP
            )
        `);
        console.log("✅ Table 'projectMembers' ready");

        // 4. Add projectId to existing tables (safe — skips if already exists)
        const tables = ["salas", "apontamentos", "uploads", "ifcFiles", "escopoAsBuilt", "entregasAsBuilt"];

        for (const table of tables) {
            try {
                // Check if column already exists
                const check = await sql`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = ${table} AND column_name = 'projectId'
                `;
                if (check.length === 0) {
                    await sql.unsafe(`
                        ALTER TABLE "${table}" 
                        ADD COLUMN "projectId" UUID REFERENCES "projects"("id") ON DELETE CASCADE
                    `);
                    console.log(`  ✅ Added "projectId" to "${table}"`);
                } else {
                    console.log(`  ⏭️  "${table}" already has "projectId"`);
                }
            } catch (e: any) {
                console.log(`  ⚠️  "${table}": ${e.message}`);
            }
        }

        console.log("\n🎉 Schema changes applied successfully!");

    } catch (error) {
        console.error("❌ Schema migration failed:", error);
    } finally {
        await sql.end();
    }
}

applySchema();
