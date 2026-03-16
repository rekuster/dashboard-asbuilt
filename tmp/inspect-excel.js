import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = 'D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\As_Built_Status - Controle de Entregas - R07.xlsx';

async function inspectExcel() {
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheetNames = workbook.SheetNames;
        const targetSheetName = 'Controle de Entregas'; // hardcoded from previous check
        const sheet = workbook.Sheets[targetSheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log('--- Scanning for Headers ---');
        data.slice(0, 100).forEach((row, i) => {
            if (row && row.length > 0 && row.some(cell => cell !== null && cell !== '')) {
                console.log(`Row ${i}:`, row);
            }
        });

    } catch (err) {
        console.error('Erro:', err);
    }
}

inspectExcel();
