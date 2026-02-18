import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { InsertSala, InsertApontamento } from '../drizzle/schema';

dayjs.extend(customParseFormat);

// Convert Excel serial date or string to JavaScript Date
function excelDateToJSDate(excelDate: any): Date | null {
    if (!excelDate) return null;

    // If it's already a Date object (often happens with cellDates: true)
    if (excelDate instanceof Date) {
        return excelDate;
    }

    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
        const jsDate = XLSX.SSF.parse_date_code(excelDate);
        return new Date(jsDate.y, jsDate.m - 1, jsDate.d, jsDate.H, jsDate.M, jsDate.S);
    }

    // If it's a string, try various formats
    if (typeof excelDate === 'string') {
        // Try DD/MM/YYYY common in Brazil
        const brFormat = dayjs(excelDate, 'DD/MM/YYYY', true);
        if (brFormat.isValid()) return brFormat.toDate();

        // Try YYYY-MM-DD
        const isoFormat = dayjs(excelDate, 'YYYY-MM-DD', true);
        if (isoFormat.isValid()) return isoFormat.toDate();

        // Fallback to native parsing
        const parsed = dayjs(excelDate);
        if (parsed.isValid()) return parsed.toDate();
    }

    return null;
}

export async function processExcelFile(fileBuffer: Buffer): Promise<{
    salas: InsertSala[];
    apontamentos: InsertApontamento[];
}> {
    try {
        const workbook = XLSX.read(fileBuffer, {
            type: 'buffer',
            cellDates: true,
            cellNF: true,
            cellText: false
        });

        const salas: InsertSala[] = [];
        const apontamentos: InsertApontamento[] = [];

        // Process "Mapeamento Salas" sheet
        if (workbook.SheetNames.includes('Mapeamento Salas')) {
            const salaSheet = workbook.Sheets['Mapeamento Salas'];
            const salaData = XLSX.utils.sheet_to_json(salaSheet);

            salaData.forEach((row: any, index: number) => {
                if (row['Sala']) {
                    // Extremely robust mapping for statusRA (Column G)
                    // 1. Try common known headers
                    let statusRA = row['Status RA'] || row['statusRa'] || row['statusRA'] || row['StatusRA'] || row['STATUS RA'];

                    // 2. If not found, look for any key that contains both "Status" and "RA"
                    if (!statusRA) {
                        const keys = Object.keys(row);
                        const matchKey = keys.find(k =>
                            k.toLowerCase().includes('status') &&
                            (k.toLowerCase().includes('ra') || k.toLowerCase().includes('obra'))
                        );
                        if (matchKey) statusRA = row[matchKey];
                    }

                    // 3. Fallback to common mangled names from XLSX
                    if (!statusRA) {
                        statusRA = row['__EMPTY_6']; // Column G is often __EMPTY_6 if header is missing
                    }

                    if (index === 0) {
                        console.log('DEBUG: Mapping row keys:', Object.keys(row));
                        console.log('DEBUG: Initial statusRA extraction:', statusRA);
                    }

                    // Robust mapping for Data Verificada (Column H)
                    let rawDate = row['Data Verificada'] || row['Data de Verificação'] || row['Data Verif'] || row['DataVerificada'] || row['DATA VERIFICADA'];
                    if (!rawDate) {
                        const keys = Object.keys(row);
                        const matchKey = keys.find(k => k.toLowerCase().includes('data') && (k.toLowerCase().includes('verif') || k.toLowerCase().includes('progresso')));
                        if (matchKey) rawDate = row[matchKey];
                    }
                    if (!rawDate) rawDate = row['__EMPTY_7']; // Column H fallback

                    salas.push({
                        edificacao: row['Edificação'] || row['Edificacao'] || '',
                        pavimento: row['Pavimento'] || '',
                        setor: row['Setor'] || '',
                        nome: row['Sala'] || '',
                        numeroSala: String(row['Número Sala'] || row['Numero Sala'] || ''),
                        augin: row['Augin?'] ? 1 : 0,
                        status: row['Status'] || 'PENDENTE',
                        statusRA: statusRA ? String(statusRA) : null,
                        dataVerificada: excelDateToJSDate(rawDate),
                        faltouDisciplina: row['Faltou Disciplina?'] || null,
                        revisar: row['Revisar'] || null,
                        obs: row['Obs'] || null,
                    });
                }
            });
        }

        // Process "Apontamentos RA Obra" sheet
        if (workbook.SheetNames.includes('Apontamentos RA Obra')) {
            const apontSheet = workbook.Sheets['Apontamentos RA Obra'];
            const apontData = XLSX.utils.sheet_to_json(apontSheet);

            apontData.forEach((row: any) => {
                if (row['Número Apontamento']) {
                    const dataApontamento = excelDateToJSDate(row['Data']);
                    apontamentos.push({
                        numeroApontamento: Number(row['Número Apontamento']) || 0,
                        data: dataApontamento || new Date(),
                        edificacao: row['Edificação'] || '',
                        pavimento: row['Pavimento'] || '',
                        setor: row['Setor'] || '',
                        sala: row['Sala'] || '',
                        disciplina: row['Disciplina'] || '',
                        divergencia: row['Divergência'] || null,
                    });
                }
            });
        }

        return { salas, apontamentos };
    } catch (error) {
        console.error('Error processing Excel file:', error);
        throw new Error('Failed to process Excel file');
    }
}
