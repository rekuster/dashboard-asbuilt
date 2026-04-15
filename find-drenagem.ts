
import ExcelJS from 'exceljs';
import path from 'path';

async function findDrenagem() {
    const filePath = path.resolve('Planilhas', 'Mapeamento Modelos As Built.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Mapeamento Modelos As Built');
    if (!sheet) return;

    for (let i = 1; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const text = row.values.toString();
        if (text.includes('DRENAGEM')) {
            console.log(`Row ${i}: ${row.values}`);
        }
    }
}
findDrenagem();
