const XLSX = require('xlsx');
const fs = require('fs');

// Read the other spreadsheets
let output = '';

// 1. As_Built_Status - Controle de Entregas
const wb1 = XLSX.readFile('D:/STECLA IA/Dashboard-AsBuilt-Custom/Planilhas/As_Built_Status - Controle de Entregas - R07.xlsx');
output += `=== FILE: As_Built_Status - Controle de Entregas - R07.xlsx ===\n`;
output += `Sheet names: ${JSON.stringify(wb1.SheetNames)}\n\n`;
for (const sheetName of wb1.SheetNames) {
  const ws = wb1.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
  output += `--- SHEET: ${sheetName} (${data.length} rows) ---\n`;
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    output += `ROW ${i}: ${JSON.stringify(data[i])}\n`;
  }
  output += `... (showing first 20 rows)\n\n`;
}

// 2. Mapeamento RA-As Built
const wb2 = XLSX.readFile('D:/STECLA IA/Dashboard-AsBuilt-Custom/Planilhas/Mapeamento RA-As Built.xlsx');
output += `\n=== FILE: Mapeamento RA-As Built.xlsx ===\n`;
output += `Sheet names: ${JSON.stringify(wb2.SheetNames)}\n\n`;
for (const sheetName of wb2.SheetNames) {
  const ws = wb2.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
  output += `--- SHEET: ${sheetName} (${data.length} rows) ---\n`;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    output += `ROW ${i}: ${JSON.stringify(data[i])}\n`;
  }
  output += `... (showing first 15 rows)\n\n`;
}

// 3. Also get the full "Mapeamento Modelos As Built" sheet
const wb3 = XLSX.readFile('D:/STECLA IA/Dashboard-AsBuilt-Custom/Planilhas/Mapeamento Modelos As Built.xlsx');
const ws3 = wb3.Sheets['Mapeamento Modelos As Built'];
const data3 = XLSX.utils.sheet_to_json(ws3, {header:1, defval:''});
output += `\n=== FULL: Mapeamento Modelos As Built (${data3.length} rows) ===\n`;
for (let i = 0; i < data3.length; i++) {
  const row = data3[i];
  const hasData = row.some(cell => cell !== '');
  if (hasData) {
    output += `ROW ${i}: ${JSON.stringify(row)}\n`;
  }
}

fs.writeFileSync('D:/STECLA IA/Dashboard-AsBuilt-Custom/tmp/other_spreadsheets.txt', output, 'utf-8');
console.log('Written to tmp/other_spreadsheets.txt');
console.log('Output size:', output.length, 'bytes');
