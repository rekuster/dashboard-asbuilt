import "dotenv/config";
import postgres from "postgres";

async function migrate() {
    const client = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });
    
    const statements = [
        `CREATE TABLE IF NOT EXISTS "verificacaoModelo" (
            "id" serial PRIMARY KEY NOT NULL,
            "salaId" integer NOT NULL,
            "disciplina" text NOT NULL,
            "status" text DEFAULT 'PENDENTE' NOT NULL,
            "observacao" text,
            "updatedAt" timestamp DEFAULT now() NOT NULL
        )`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "identificadorEntrega" text`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "formato" text`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "isModelo" integer DEFAULT 0`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "modeloBaseReferencia" text`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "acoesNecessarias" text`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "checkpointBep" text`,
        `ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "avancoFisico" text`,
        `ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "temRvtOriginal" integer DEFAULT 0`,
        `ALTER TABLE "escopoAsBuilt" ADD COLUMN IF NOT EXISTS "pendenciaRvt" text`
    ];

    for (const stmt of statements) {
        try {
            console.log(`Executing: ${stmt.substring(0, 50)}...`);
            await client.unsafe(stmt);
            console.log("Success!");
        } catch (e) {
            console.warn(`Failed (maybe already exists): ${e.message}`);
        }
    }

    await client.end();
}

migrate();
