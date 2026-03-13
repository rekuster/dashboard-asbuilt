
import ExcelJS from 'exceljs';
import path from 'path';

async function bashInspect() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.resolve('Planilhas', 'As_Built_Status - Controle de Entregas - R07.xlsx');
    
    await workbook.xlsx.readFile(filePath);
    
    console.log('--- SHEETS ---');
    workbook.eachSheet(s => console.log(s.name));

    const sheet = workbook.getWorksheet('Controle de Entregas') || workbook.worksheets[0];
    console.log('\n--- ROWS ---');
    let output = '--- ROWS ---\n';
    sheet.eachRow((row, i) => {
        if (i > 30) return;
        const vals = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
        output += `Row ${i}: ${vals.map(v => typeof v === 'object' && v !== null ? (v as any).result || JSON.stringify(v) : v).join(' | ')}\n`;
    });
    const fs = await import('fs');
    fs.writeFileSync('inspect-output.txt', output);
    console.log('Output written to inspect-output.txt');
}

bashInspect().catch(err => console.error('ERROR:', err));
