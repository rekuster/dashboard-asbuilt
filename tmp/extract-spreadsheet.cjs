const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('D:/STECLA IA/Dashboard-AsBuilt-Custom/Planilhas/Mapeamento Modelos As Built.xlsx');
console.log('Sheet names:', wb.SheetNames);

const ws = wb.Sheets['Mapeamento Entrega As Built'];
const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});

let output = '';
output += `=== SHEET: Mapeamento Entrega As Built ===\n`;
output += `Total rows: ${data.length}\n\n`;
output += `HEADERS: ${JSON.stringify(data[0])}\n\n`;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const hasData = row.some((cell, idx) => cell !== '' && idx !== 0 && idx !== 8 && idx !== 9);
  if (hasData) {
    output += `ROW ${i}: ${JSON.stringify(row)}\n`;
  }
}

for (const sheetName of wb.SheetNames) {
  if (sheetName !== 'Mapeamento Entrega As Built') {
    output += `\n\n=== SHEET: ${sheetName} ===\n`;
    const ws2 = wb.Sheets[sheetName];
    const data2 = XLSX.utils.sheet_to_json(ws2, {header:1, defval:''});
    output += `Total rows: ${data2.length}\n\n`;
    for (let i = 0; i < Math.min(data2.length, 10); i++) {
      output += `ROW ${i}: ${JSON.stringify(data2[i])}\n`;
    }
    output += `... (showing first 10 rows)\n`;
  }
}

fs.writeFileSync('D:/STECLA IA/Dashboard-AsBuilt-Custom/tmp/spreadsheet_data.txt', output, 'utf-8');
console.log('Written to tmp/spreadsheet_data.txt');
console.log('Output size:', output.length, 'bytes');
