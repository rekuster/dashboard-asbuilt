
import ExcelJS from 'exceljs';
import path from 'path';

async function inspectThaSpreadsheet() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.resolve('Planilhas', 'As_Built_Status - Controle de Entregas - R07.xlsx');
    
    console.log(`Lendo arquivo: ${filePath}`);
    await workbook.xlsx.readFile(filePath);
    
    console.log('Abas encontradas:');
    workbook.eachSheet(sheet => {
        console.log(`- ${sheet.name} (ID: ${sheet.id})`);
    });

    const mainSheet = workbook.getWorksheet(1); // Usually the first one
    console.log(`\nInspecionando a primeira aba: ${mainSheet.name}`);
    
    // Read first 5 rows to see headers/data
    mainSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 5) return;
        console.log(`Linha ${rowNumber}:`, row.values);
    });
}

inspectThaSpreadsheet().catch(console.error);
