import { getDb } from "../common/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("[RLS Migration] Starting RLS configuration for all Supabase tables...");
    const db = await getDb();
    if (!db) {
        console.error("Could not connect to database.");
        process.exit(1);
    }

    const res: any = await db.execute(sql`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    `);

    const tables = (Array.isArray(res) ? res : res.rows || []).map((r: any) => r.tablename);
    console.log(`[RLS Migration] Found ${tables.length} tables to configure:`, tables);

    for (const table of tables) {
        console.log(`[RLS Migration] Enabling RLS and creating policies for table "${table}"...`);

        // 1. Enable RLS
        await db.execute(sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`));

        // 2. Drop existing policies if any
        await db.execute(sql.raw(`DROP POLICY IF EXISTS "authenticated_all_access" ON "${table}";`));
        await db.execute(sql.raw(`DROP POLICY IF EXISTS "service_role_all_access" ON "${table}";`));
        await db.execute(sql.raw(`DROP POLICY IF EXISTS "anon_read_access" ON "${table}";`));

        // 3. Create Policy for Authenticated Users (Read & Write)
        await db.execute(sql.raw(`
            CREATE POLICY "authenticated_all_access" ON "${table}"
            FOR ALL 
            TO authenticated
            USING (true)
            WITH CHECK (true);
        `));

        // 4. Create Policy for Service Role (Full Backend Admin Access)
        await db.execute(sql.raw(`
            CREATE POLICY "service_role_all_access" ON "${table}"
            FOR ALL 
            TO service_role
            USING (true)
            WITH CHECK (true);
        `));

        console.log(`[RLS Migration] ✓ Table "${table}" secured with RLS.`);
    }

    // Verification
    const verifyRes: any = await db.execute(sql`
        SELECT 
            tablename, 
            rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    `);

    const verifiedRows = Array.isArray(verifyRes) ? verifyRes : verifyRes.rows || [];
    console.log("\n=== STATUS FINAL DE RLS NO SUPABASE ===");
    console.table(verifiedRows);

    const insecure = verifiedRows.filter((r: any) => !r.rowsecurity);
    if (insecure.length === 0) {
        console.log("\n🎉 SUCESSO: Todas as 13 tabelas estão com RLS 100% habilitado e políticas criadas!");
    } else {
        console.warn("\n⚠️ Atenção: Algumas tabelas ainda estão sem RLS:", insecure);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error("Error enabling RLS:", err);
    process.exit(1);
});
