import "dotenv/config";
import postgres from "postgres";

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL missing");
        return;
    }
    const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

    console.log("Reading auth.users...");
    const authUsers = await sql`SELECT id, email, raw_user_meta_data FROM auth.users`;
    console.log("Auth users found:", authUsers.map((u) => u.email));

    const projs = await sql`SELECT id, code, name FROM projects`;
    console.log("Projects found:", projs.map((p) => p.name));

    for (const au of authUsers) {
        const email = (au.email || "").toLowerCase();
        const meta = au.raw_user_meta_data || {};
        const name = meta.name || email.split("@")[0];
        const isStecla = email.includes("stecla") || email.includes("renata");
        const role = isStecla ? "admin" : "parceiro";
        const empresa = isStecla ? "Stecla" : "Ocle";

        console.log(`Syncing user ${email} as ${role} (${empresa})...`);

        // Upsert into users table
        const existingUsers = await sql`SELECT id FROM users WHERE LOWER(email) = ${email}`;
        if (existingUsers.length > 0) {
            await sql`
                UPDATE users 
                SET role = ${role}, name = ${name}, "updatedAt" = NOW()
                WHERE id = ${existingUsers[0].id}
            `;
        } else {
            await sql`
                INSERT INTO users ("openId", email, name, role, "createdAt", "updatedAt", "lastSignedIn")
                VALUES (${au.id}, ${email}, ${name}, ${role}, NOW(), NOW(), NOW())
            `;
        }

        // Se for Stecla/Admin, vincula em todos os projetos
        if (isStecla) {
            for (const p of projs) {
                const existingM = await sql`
                    SELECT id FROM "projectMembers" 
                    WHERE "projectId" = ${p.id} AND LOWER(email) = ${email}
                `;
                if (existingM.length === 0) {
                    await sql`
                        INSERT INTO "projectMembers" ("projectId", "userId", email, role, empresa, "invitedAt", "acceptedAt")
                        VALUES (${p.id}, ${au.id}, ${email}, 'admin', 'Stecla', NOW(), NOW())
                    `;
                } else {
                    await sql`
                        UPDATE "projectMembers"
                        SET role = 'admin', empresa = 'Stecla'
                        WHERE id = ${existingM[0].id}
                    `;
                }
            }
        }
    }

    console.log("--- FINAL USERS TABLE ---");
    const finalUsers = await sql`SELECT id, "openId", name, email, role FROM users`;
    console.log(finalUsers);

    console.log("--- FINAL MEMBERS TABLE ---");
    const finalMembers = await sql`SELECT id, "projectId", email, role, empresa FROM "projectMembers"`;
    console.log(finalMembers);

    await sql.end();
}

main().catch(console.error);
