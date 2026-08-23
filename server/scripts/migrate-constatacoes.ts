import { getDb } from "../common/db";
import { sql } from "drizzle-orm";

async function run() {
    console.log("[Migration] Running migration for constatacoesTecnicas...");
    const db = await getDb();
    if (!db) {
        console.error("Could not connect to database.");
        process.exit(1);
    }

    // 1. Create table if not exists
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "constatacoesTecnicas" (
            "id" SERIAL PRIMARY KEY,
            "projectId" UUID REFERENCES "projects"("id") ON DELETE CASCADE,
            "empresa" TEXT NOT NULL,
            "edificacao" TEXT NOT NULL,
            "texto" TEXT NOT NULL,
            "destaque" INTEGER DEFAULT 0 NOT NULL,
            "ordem" INTEGER DEFAULT 0 NOT NULL,
            "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
            "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "constatacoes_proj_emp_idx" ON "constatacoesTecnicas"("projectId", "empresa");
    `);
    console.log("[Migration] Table constatacoesTecnicas verified/created.");

    // 2. Check if we have project and seed if needed
    const projectsList: any = await db.execute(sql`SELECT id FROM "projects" LIMIT 5`);
    const projectRows = Array.isArray(projectsList) ? projectsList : projectsList.rows || [];

    for (const p of projectRows) {
        const pId = p.id;
        const existing: any = await db.execute(sql`SELECT COUNT(*)::int as count FROM "constatacoesTecnicas" WHERE "projectId" = ${pId}`);
        const count = existing[0]?.count || existing.rows?.[0]?.count || 0;

        if (count === 0) {
            console.log(`[Migration] Seeding default constatacoes for project ${pId}...`);
            
            // Seed Thá
            const thaItems = [
                { edif: "Implantação", texto: "Drenagem foi o único modelo com entregas parciais evolutivas conforme execução.", destaque: 0 },
                { edif: "Implantação", texto: "Modelos de Estruturas de concreto (bancos, caixas, escadas) não entregues conforme execução.", destaque: 0 },
                { edif: "Prédio Suporte", texto: "4 modelos entregues são cópias dos modelos de projeto sem qualquer representação do executado em campo.", destaque: 1 },
                { edif: "Portaria", texto: "Nenhuma entrega realizada.", destaque: 0 },
                { edif: "Central de Utilidades", texto: "Modelo de estrutura entregue apenas em .ifc. Estrutura do Pátio de Utilidades não entregue.", destaque: 0 },
                { edif: "Prédio Produção", texto: "Modelos de Hidrossanitário são os mais críticos e as entregas não refletem o que foi executado.", destaque: 1 },
            ];

            for (let i = 0; i < thaItems.length; i++) {
                const item = thaItems[i];
                await db.execute(sql`
                    INSERT INTO "constatacoesTecnicas" ("projectId", "empresa", "edificacao", "texto", "destaque", "ordem")
                    VALUES (${pId}, 'Thá', ${item.edif}, ${item.texto}, ${item.destaque}, ${i})
                `);
            }

            // Seed Ocle
            const ocleItems = [
                { edif: "Prédio Produção", texto: "Modelos de Climatização e Gases entregues com pendências pontuais de conexões.", destaque: 0 },
                { edif: "Central de Utilidades", texto: "Tubulações de utilidades validadas em campo com modelo RVT conforme execução.", destaque: 0 },
                { edif: "Implantação", texto: "Rede de média tensão com pendência de validação em caixas de passagem.", destaque: 1 },
            ];

            for (let i = 0; i < ocleItems.length; i++) {
                const item = ocleItems[i];
                await db.execute(sql`
                    INSERT INTO "constatacoesTecnicas" ("projectId", "empresa", "edificacao", "texto", "destaque", "ordem")
                    VALUES (${pId}, 'Ocle', ${item.edif}, ${item.texto}, ${item.destaque}, ${i})
                `);
            }

            console.log(`[Migration] Seeded default constatacoes for Thá & Ocle on project ${pId}.`);
        }
    }

    console.log("[Migration] Migration completed successfully.");
    process.exit(0);
}

run().catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
});
