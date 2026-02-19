import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import path from "path";

const DIR = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Relatório de divergencias";
const FILENAME = "Mapeamento RA-As Built.xlsx";
const EXCEL_PATH = path.join(DIR, FILENAME);

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = "Apontamentos RA Obra";
const sheet = workbook.Sheets[sheetName];

if (sheet) {
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { limit: 1 });
    if (data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
        console.log("Sample:", data[0]);
    } else {
        console.log("Sheet is empty.");
    }
} else {
    console.log(`Sheet '${sheetName}' not found.`);
}
