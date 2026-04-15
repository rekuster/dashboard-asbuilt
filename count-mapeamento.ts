
import ExcelJS from 'exceljs';
import path from 'path';

async function countRows() {
    const filePath = path.resolve('Planilhas', 'Mapeamento Modelos As Built.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Mapeamento Modelos As Built');
    console.log(`Total rows in Mapeamento: ${sheet?.rowCount}`);
}
countRows();
