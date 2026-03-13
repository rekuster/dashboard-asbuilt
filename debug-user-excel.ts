
import ExcelJS from "exceljs";
import fs from "fs";

async function checkSpreadsheets() {
    const files = [
        "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento RA-As Built.xlsx",
        "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\As_Built_Status - Controle de Entregas - R07.xlsx"
    ];

    for (const file of files) {
        console.log(`\n--- 📂 Analyzing: ${file} ---`);
        if (!fs.existsSync(file)) {
            console.error("❌ File not found!");
            continue;
        }

        const workbook = new ExcelJS.Workbook();
        try {
            await workbook.xlsx.readFile(file);
            workbook.eachSheet((sheet, id) => {
                console.log(`\n📄 Sheet ${id}: ${sheet.name}`);
                const headerRow = sheet.getRow(1);
                const headers: any[] = [];
                headerRow.eachCell((cell, colNumber) => {
                    headers.push({ col: colNumber, val: cell.value });
                });
                console.log("   Headers:", JSON.stringify(headers, null, 2));
                
                // Print a few rows of data to understand the content
                console.log("   First 3 data rows:");
                for (let i = 2; i <= 4; i++) {
                    const row = sheet.getRow(i);
                    const values: any[] = [];
                    row.eachCell((cell) => values.push(cell.value));
                    if (values.length > 0) console.log(`   Row ${i}:`, JSON.stringify(values));
                }
            });
        } catch (err) {
            console.error(`❌ Error reading ${file}:`, err);
        }
    }
}

checkSpreadsheets();
