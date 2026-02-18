import { getDb, salas } from "./server/db";
import { sql } from "drizzle-orm";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

async function diag() {
    const db = await getDb();
    if (!db) return;

    const allVerified = await db.select({
        nome: salas.nome,
        data: salas.dataVerificada,
        semanaISO: sql`to_char("dataVerificada", 'IYYY-"W"IW')`
    }).from(salas).where(sql`"dataVerificada" IS NOT NULL`);

    console.log("--- Cruzamento de Semanas (Jan 2026) ---");
    allVerified.filter(r => r.data && r.data.toISOString().startsWith("2026-01")).forEach(r => {
        const d = dayjs(r.data);
        console.log(`Sala: ${r.nome} | Data: ${r.data?.toISOString()} | ISO Week DB: ${r.semanaISO} | Dayjs ISO Week: ${d.isoWeek()} | Month: ${d.month() + 1}`);
    });

    process.exit(0);
}

diag().catch(console.error);
