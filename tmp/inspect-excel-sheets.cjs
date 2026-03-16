const XLSX = require('xlsx');
const path = require('path');

const excelPath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas Mapeamento Modelos As Built.xlsx";

function inspectExcel() {
    try {
        const workbook = XLSX.readFile(excelPath);
        console.log("Planilhas encontradas:", workbook.SheetNames);
    } catch (e) {
        console.error("Erro ao ler excel:", e.message);
    }
}

inspectExcel();
