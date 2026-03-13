
import ExcelJS from "exceljs";
import fs from "fs";

async function analyzeThaDetail() {
    const file = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\As_Built_Status - Controle de Entregas - R07.xlsx";
    console.log(`Analyzing: ${file}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    
    const sheet = workbook.getWorksheet("Controle de Entregas");
    if (!sheet) {
        console.error("Sheet 'Controle de Entregas' not found!");
        return;
    }

    console.log("Reading first 15 rows...");
    for (let i = 1; i <= 15; i++) {
        const row = sheet.getRow(i);
        const values: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => values.push(cell.value));
        console.log(`Row ${i}:`, JSON.stringify(values));
    }
}

analyzeThaDetail();
