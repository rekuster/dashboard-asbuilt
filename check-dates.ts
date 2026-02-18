import { getDb, salas } from './server/db';

async function checkData() {
    const db = await getDb();
    if (!db) return;

    const allRooms = await db.select({
        nome: salas.nome,
        status: salas.status,
        statusRA: salas.statusRA,
        dataVerificada: salas.dataVerificada,
        updatedAt: salas.updatedAt
    })
        .from(salas);

    console.log("=== SALAS LIKELY VERIFIED BUT NO DATE ===");
    allRooms.forEach(r => {
        const s = (r.status || '').toUpperCase();
        const sra = (r.statusRA || '').toUpperCase();
        const isVerified = s.includes('VERIF') || sra.includes('LIBERADO');

        if (isVerified && !r.dataVerificada) {
            console.log(`Sala: ${r.nome} | Status: ${r.status} | RA: ${r.statusRA} | UpdatedAt: ${r.updatedAt}`);
        }
    });

    console.log("=== JAN 2026 REVIEWS ===");
    allRooms.forEach(r => {
        if (r.dataVerificada) {
            const d = new Date(r.dataVerificada as any);
            if (d.getFullYear() === 2026) {
                console.log(`Sala: ${r.nome} | Date: ${d.toISOString()}`);
            }
        }
    });
}

checkData();
