const XLSX = require('xlsx');
const path = require('path');

const excelPath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx";

function inspectExcel() {
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log("Colunas encontradas:", Object.keys(rows[0] || {}));
        console.log("Primeiras 2 linhas:", JSON.stringify(rows.slice(0, 2), null, 2));
    } catch (e) {
        console.error("Erro ao ler excel:", e.message);
    }
}

inspectExcel();
