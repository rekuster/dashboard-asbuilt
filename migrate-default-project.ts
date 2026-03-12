/**
 * Migration script: Create default project "NEO-23001 SuperNova"
 * and link all existing data to it.
 * 
 * Run after schema changes (drizzle-kit push):
 *   npx tsx migrate-default-project.ts
 */
import "dotenv/config";
import postgres from "postgres";

async function migrate() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.error("❌ DATABASE_URL not set");
        process.exit(1);
    }

    const sql = postgres(DATABASE_URL, {
        ssl: { rejectUnauthorized: false },
        max: 1,
    });

    console.log("🔄 Starting migration...");

    try {
        // 1. Check if projects table exists (schema already pushed)
        const tableCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'projects'
            ) as exists
        `;

        if (!tableCheck[0].exists) {
            console.error("❌ 'projects' table not found. Run 'npm run db:push' first.");
            process.exit(1);
        }

        // 2. Check if default project already exists
        const existing = await sql`
            SELECT id FROM projects WHERE code = 'NEO-23001' LIMIT 1
        `;

        let projectId: string;

        if (existing.length > 0) {
            projectId = existing[0].id;
            console.log(`✅ Default project already exists: ${projectId}`);
        } else {
            // 3. Create the default project
            const result = await sql`
                INSERT INTO projects (id, code, name, client, status, "ownerId", "createdAt", "updatedAt")
                VALUES (
                    gen_random_uuid(), 
                    'NEO-23001', 
                    'SuperNova', 
                    'Neodent', 
                    'ativo',
                    'system-migration',
                    NOW(), 
                    NOW()
                )
                RETURNING id
            `;
            projectId = result[0].id;
            console.log(`✅ Created default project: ${projectId}`);
        }

        // 4. Link existing data to default project
        const tables = ['salas', 'apontamentos', 'uploads', '"ifcFiles"', '"escopoAsBuilt"', '"entregasAsBuilt"'];

        for (const table of tables) {
            try {
                const result = await sql.unsafe(
                    `UPDATE ${table} SET "projectId" = '${projectId}' WHERE "projectId" IS NULL`
                );
                console.log(`  📎 ${table}: linked records`);
            } catch (e: any) {
                console.log(`  ⚠️ ${table}: ${e.message}`);
            }
        }

        console.log("\n🎉 Migration complete!");
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Project: NEO-23001 SuperNova (Neodent)`);

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await sql.end();
    }
}

migrate();
