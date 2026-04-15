
import ExcelJS from 'exceljs';
import path from 'path';

async function verify() {
    const filePath = path.resolve('Planilhas', 'As_Built_Status - Controle de Entregas - R07.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Controle de Entregas');
    if (!sheet) return;

    for (let i = 13; i <= 20; i++) {
        const row = sheet.getRow(i);
        console.log(`Row ${i}:`);
        row.eachCell((cell, colNumber) => {
            console.log(`  Col ${colNumber}: ${cell.value}`);
        });
    }
}
verify();
