
import ExcelJS from 'exceljs';
import path from 'path';

async function listSheets() {
    const filePath = path.resolve('Planilhas', 'As_Built_Status - Controle de Entregas - R07.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log('Sheets present in workbook:', workbook.worksheets.map(w => w.name));
}
listSheets();
