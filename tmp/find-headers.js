import ExcelJS from 'exceljs';

const excelPath = 'D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\As_Built_Status - Controle de Entregas - R07.xlsx';

async function findTableHeaders() {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        
        workbook.eachSheet((worksheet) => {
            console.log(`--- Lendo aba: ${worksheet.name} ---`);
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1000) return; // limit
                const values = row.values;
                if (Array.isArray(values)) {
                    if (values.includes('Número') && values.includes('Data') && values.includes('Entrega')) {
                        console.log(`[FOUND] Sheet: ${worksheet.name}, Row ${rowNumber}:`, values);
                    }
                }
            });
        });

    } catch (err) {
        console.error('Erro:', err);
    }
}

findTableHeaders();
