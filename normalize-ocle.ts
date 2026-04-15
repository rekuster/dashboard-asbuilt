import { getDb } from "./server/db";
import { entregasAsBuilt } from "./drizzle/schema.pg";
import { eq } from "drizzle-orm";

async function normalizeCompanies() {
    console.log("🔍 Normalizando nomes de empresas...");
    
    const db = await getDb();
    if (!db) {
        console.error("❌ Não foi possível conectar ao banco.");
        process.exit(1);
    }

    // Buscar todas as entregas
    const allEntregas = await db.select().from(entregasAsBuilt);
    
    let count = 0;
    for (const entrega of allEntregas) {
        // Normaliza "OCLE", "ocle", etc para "Ocle"
        if (entrega.empresaResponsavel && entrega.empresaResponsavel.toUpperCase() === "OCLE" && entrega.empresaResponsavel !== "Ocle") {
            await db.update(entregasAsBuilt)
                .set({ empresaResponsavel: "Ocle" })
                .where(eq(entregasAsBuilt.id, entrega.id));
            count++;
        }
    }
    
    console.log(`✅ Sucesso! ${count} entregas foram atualizadas para 'Ocle'.`);
    process.exit(0);
}

normalizeCompanies().catch(err => {
    console.error("❌ Erro ao normalizar:", err);
    process.exit(1);
});
