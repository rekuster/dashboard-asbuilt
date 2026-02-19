import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

const EXCEL_PATH = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Relatório de divergencias\\Mapeamento RA-As Built.xlsx";

async function checkHeaders() {
    console.log(`📂 Reading: ${EXCEL_PATH}`);
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error("❌ File not found!");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);

    workbook.eachSheet((sheet, id) => {
        console.log(`\n📄 Sheet ${id}: ${sheet.name}`);
        const headerRow = sheet.getRow(1);
        const headers: any[] = [];
        headerRow.eachCell((cell, colNumber) => {
            headers.push({ col: colNumber, val: cell.value });
        });
        console.log("   Headers:", JSON.stringify(headers, null, 2));
    });
}

checkHeaders();
