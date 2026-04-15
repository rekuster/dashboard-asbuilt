import * as XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('Planilhas/Mapeamento Modelos As Built.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = 'Mapeamento Entrega As Built';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
    console.error(`Aba "${sheetName}" não encontrada!`);
    console.log('Abas disponíveis:', workbook.SheetNames);
    process.exit(1);
}

const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log(`=== DADOS DA ABA: ${sheetName} ===`);
data.slice(0, 10).forEach((row, i) => {
    console.log(`Linha ${i}:`, row);
});

process.exit(0);
