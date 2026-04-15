
import ExcelJS from 'exceljs';
import path from 'path';

async function inspectMapeamento() {
    const filePath = path.resolve('Planilhas', 'As_Built_Status - Controle de Entregas - R07.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Mapeamento Modelos As Built');
    if (!sheet) {
        console.error('Sheet not found');
        return;
    }

    console.log(`Analyzing first 20 rows of 'Mapeamento Modelos As Built'...`);
    for (let i = 1; i <= 20; i++) {
        const row = sheet.getRow(i);
        process.stdout.write(`Row ${i}: `);
        row.eachCell((cell, colIdx) => {
            process.stdout.write(`[${colIdx}]: ${cell.value} | `);
        });
        console.log();
    }
}
inspectMapeamento();
