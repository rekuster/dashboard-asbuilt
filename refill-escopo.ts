
import ExcelJS from 'exceljs';
import path from 'path';
import { getDb, escopoAsBuilt } from './server/db';
import { eq } from 'drizzle-orm';

async function refillEscopo() {
    console.log('--- Refilling Escopo As-Built from Mapeamento Spreadsheet ---');
    const db = await getDb();
    const filePath = path.resolve('Planilhas', 'Mapeamento Modelos As Built.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Mapeamento Modelos As Built');
    if (!sheet) return;

    let added = 0;
    let updated = 0;

    for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const edificacao = row.getCell(2).value?.toString() || '';
        const disciplina = row.getCell(3).value?.toString() || '';
        const modeloBase = row.getCell(4).value?.toString() || '';
        const modeloFinal = row.getCell(10).value?.toString() || ''; // Col J is 10
        const empresa = row.getCell(8).value?.toString() || 'Thá / Stecla';

        if (!modeloBase && !modeloFinal) continue;

        // Check if exists
        const existing = await db.select().from(escopoAsBuilt)
            .where(eq(escopoAsBuilt.nomeModelo, modeloBase))
            .limit(1);

        if (existing.length > 0) {
            await db.update(escopoAsBuilt).set({
                edificacao,
                disciplina,
                nomeModeloFinal: modeloFinal,
                empresa,
                updatedAt: new Date()
            }).where(eq(escopoAsBuilt.id, existing[0].id));
            updated++;
        } else {
            await db.insert(escopoAsBuilt).values({
                edificacao,
                disciplina,
                nomeModelo: modeloBase,
                nomeModeloFinal: modeloFinal,
                empresa,
                ativo: 1,
                temRvtOriginal: 0
            });
            added++;
        }
    }

    console.log(`Refill complete. Added: ${added}, Updated: ${updated}`);
}

refillEscopo().catch(console.error);
