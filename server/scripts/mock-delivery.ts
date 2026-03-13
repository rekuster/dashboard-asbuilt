import { getDb, entregasAsBuilt, escopoAsBuilt } from "../db";

async function main() {
    const db = await getDb();
    if (!db) return;

    // 1. Get first escopo item
    const [firstEscopo] = await db.select().from(escopoAsBuilt).limit(1);
    if (!firstEscopo) {
        console.error("No escopo items found");
        return;
    }

    console.log(`Creating mock delivery for: ${firstEscopo.nomeModeloFinal} (ID: ${firstEscopo.id})`);

    // 2. Insert delivery
    const result = await db.insert(entregasAsBuilt).values({
        escopoId: firstEscopo.id,
        nomeDocumento: "Mock Integration Test",
        tipoDocumento: "IFC",
        edificacao: firstEscopo.edificacao,
        disciplina: firstEscopo.disciplina,
        empresaResponsavel: firstEscopo.empresa,
        dataPrevista: new Date(),
        dataRecebimento: new Date(),
        status: 'VALIDADO',
        createdAt: new Date(),
        updatedAt: new Date()
    }).returning();

    console.log("Mock delivery created:", result[0].id);
}

main().catch(console.error);
