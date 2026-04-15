
import ExcelJS from 'exceljs';
import path from 'path';

async function findDRE() {
    const filePath = path.resolve('Planilhas', 'Mapeamento Modelos As Built.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Mapeamento Modelos As Built');
    if (!sheet) return;

    for (let i = 1; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const text = row.values.toString();
        if (text.includes('DRE') || text.includes('PAVIM')) {
            console.log(`Row ${i}: ${row.values}`);
        }
    }
}
findDRE();
