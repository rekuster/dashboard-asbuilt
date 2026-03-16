import ExcelJS from 'exceljs';

const excelPath = 'D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx';

async function findInMapeamento() {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        
        workbook.eachSheet((worksheet) => {
            console.log(`--- Lendo aba: ${worksheet.name} ---`);
            worksheet.eachRow((row, rowNumber) => {
                const values = row.values;
                if (Array.isArray(values)) {
                    const rowText = values.join(' | ');
                    if (rowText.includes('Número') && rowText.includes('Data') && rowText.includes('Entrega')) {
                        console.log(`[FOUND] Sheet: ${worksheet.name}, Row ${rowNumber}:`, values);
                    }
                }
            });
        });

    } catch (err) {
        console.error('Erro:', err);
    }
}

findInMapeamento();
