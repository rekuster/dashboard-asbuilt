/**
 * Fix project ownership: Update all projects with ownerId='system-migration'
 * to be owned by the first registered user (or a specific user).
 * 
 * Run: npx tsx fix-project-owner.ts
 */
import "dotenv/config";
import postgres from "postgres";

async function fixOwner() {
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

    try {
        // 1. List all Supabase Auth users from auth.users table
        console.log("🔍 Looking for registered users in auth.users...\n");
        
        const authUsers = await sql`
            SELECT id, email, created_at 
            FROM auth.users 
            ORDER BY created_at ASC
        `;

        if (authUsers.length === 0) {
            console.log("❌ No users found in auth.users");
            await sql.end();
            return;
        }

        console.log("📋 Registered users:");
        authUsers.forEach((u: any, i: number) => {
            console.log(`  ${i + 1}. ${u.email} (ID: ${u.id})`);
        });

        // 2. Use the first user as the owner
        const ownerUser = authUsers[0];
        console.log(`\n👤 Setting owner to: ${ownerUser.email} (${ownerUser.id})`);

        // 3. Update projects
        const result = await sql`
            UPDATE projects 
            SET "ownerId" = ${ownerUser.id}
            WHERE "ownerId" = 'system-migration'
            RETURNING code, name
        `;

        if (result.length > 0) {
            console.log(`\n✅ Updated ${result.length} project(s):`);
            result.forEach((p: any) => {
                console.log(`  📁 ${p.code} — ${p.name}`);
            });
        } else {
            console.log("\n⏭️  No projects needed updating (already assigned)");
        }

        // 4. Also add the user as a project member (owner role)
        const projects = await sql`SELECT id, code FROM projects`;
        for (const project of projects) {
            const existing = await sql`
                SELECT id FROM "projectMembers" 
                WHERE "projectId" = ${project.id} AND "userId" = ${ownerUser.id}
            `;
            if (existing.length === 0) {
                await sql`
                    INSERT INTO "projectMembers" ("id", "projectId", "userId", "email", "role", "invitedAt", "acceptedAt")
                    VALUES (gen_random_uuid(), ${project.id}, ${ownerUser.id}, ${ownerUser.email}, 'owner', NOW(), NOW())
                `;
                console.log(`  👥 Added ${ownerUser.email} as owner of ${project.code}`);
            }
        }

        console.log("\n🎉 Done! Refresh the app to see your projects.");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await sql.end();
    }
}

fixOwner();
