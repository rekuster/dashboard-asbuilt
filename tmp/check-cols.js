import ExcelJS from 'exceljs';

const excelPath = 'D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx';

async function checkCols() {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        const worksheet = workbook.getWorksheet('Mapeamento Entrega As Built');

        console.log('--- Verificando Colunas das Primeiras 10 Linhas ---');
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 10) return;
            console.log(`Row ${rowNumber}: Col1='${row.getCell(1).value}', Col2='${row.getCell(2).value}', Col3='${row.getCell(3).value}'`);
        });

    } catch (err) {
        console.error(err);
    }
}

checkCols();
