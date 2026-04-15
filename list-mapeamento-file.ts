
import ExcelJS from 'exceljs';
import path from 'path';

async function listMapeamento() {
    const filePath = path.resolve('Planilhas', 'Mapeamento Modelos As Built.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('Sheets in Mapeamento:', workbook.worksheets.map(w => w.name));
    const sheet = workbook.getWorksheet('Mapeamento Modelos As Built');
    if (!sheet) return;

    for (let i = 1; i <= 10; i++) {
        const row = sheet.getRow(i);
        process.stdout.write(`Row ${i}: `);
        row.eachCell((cell, colIdx) => {
            process.stdout.write(`[${colIdx}]: ${cell.value} | `);
        });
        console.log();
    }
}
listMapeamento();
