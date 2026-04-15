import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { InsertSala, InsertApontamento, InsertEntregaAsBuilt } from '../drizzle/schema';

dayjs.extend(customParseFormat);

/**
 * EXPLICAÇÃO PARA O USUÁRIO:
 * Este arquivo é o "tradutor" do Excel. Ele lê as planilhas que você envia e transforma em dados
 * que o sistema consegue entender e salvar no banco de dados.
 */

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
    entregas?: any[]; // Using any to avoid complex type issues with cross-schema imports
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
        const entregas: any[] = [];

        // Process "Mapeamento Salas" sheet
        if (workbook.SheetNames.includes('Mapeamento Salas')) {
            const salaSheet = workbook.Sheets['Mapeamento Salas'];
            const salaData = XLSX.utils.sheet_to_json(salaSheet);

            salaData.forEach((row: any, index: number) => {
                if (row['Sala']) {
                    // Extremely robust mapping for statusRA (Column G)
                    let statusRA = row['Status RA'] || row['statusRa'] || row['statusRA'] || row['StatusRA'] || row['STATUS RA'];

                    if (!statusRA) {
                        const keys = Object.keys(row);
                        const matchKey = keys.find(k =>
                            k.toLowerCase().includes('status') &&
                            (k.toLowerCase().includes('ra') || k.toLowerCase().includes('obra'))
                        );
                        if (matchKey) statusRA = row[matchKey];
                    }

                    if (!statusRA) {
                        statusRA = row['__EMPTY_6'];
                    }

                    // Robust mapping for Data Verificada (Column H)
                    let rawDate = row['Data Verificada'] || row['Data de Verificação'] || row['Data Verif'] || row['DataVerificada'] || row['DATA VERIFICADA'];
                    if (!rawDate) {
                        const keys = Object.keys(row);
                        const matchKey = keys.find(k => k.toLowerCase().includes('data') && (k.toLowerCase().includes('verif') || k.toLowerCase().includes('progresso')));
                        if (matchKey) rawDate = row[matchKey];
                    }
                    if (!rawDate) rawDate = row['__EMPTY_7'];

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

        // NOVO: Processar "Mapeamento Entrega As Built"
        // Esta aba contém a Lista Mestra de entregas e documentos
        if (workbook.SheetNames.includes('Mapeamento Entrega As Built')) {
            const entregaSheet = workbook.Sheets['Mapeamento Entrega As Built'];
            // Usamos raw: true para pegar os nomes das colunas exatamente como no Excel
            const entregaData = XLSX.utils.sheet_to_json(entregaSheet);

            entregaData.forEach((row: any) => {
                /**
                 * MAPEAMENTO FIEL ÀS COLUNAS:
                 * A (Número)      -> numeroEntrega
                 * B (Data)        -> dataRecebimento
                 * C (Entrega)     -> identificadorEntrega
                 * D (Responsável) -> empresaResponsavel
                 * E (Edificação)  -> edificacao
                 * F (Disciplina)  -> disciplina
                 * G (Arquivo)     -> nomeDocumento
                 * H (Formato)     -> formato
                 * I (Modelo?)     -> isModelo
                 */
                const nomeDoc = row['Arquivo'] || row['G'] || row['nomeDocumento'] || row['Arquivo Entregue'];
                
                if (nomeDoc || row['Número'] || row['Numero']) {
                    const rawDate = row['Data'] || row['B'] || row['Recebimento'];
                    const dataEnt = excelDateToJSDate(rawDate);
                    
                    const formato = String(row['Formato'] || row['H'] || '').toLowerCase().trim();
                    const isModeloRaw = String(row['Modelo?'] || row['I'] || '').toLowerCase().trim();

                    entregas.push({
                        numeroEntrega: Number(row['Número'] || row['Numero'] || row['A'] || 0),
                        dataRecebimento: dataEnt,
                        dataPrevista: dataEnt || new Date(), // Obrigatório no banco, usamos a data de recebimento como padrão
                        identificadorEntrega: String(row['Entrega'] || row['C'] || row['Código'] || ''),
                        empresaResponsavel: String(row['Responsável'] || row['Responsavel'] || row['D'] || 'Não informado'),
                        edificacao: String(row['Edificação'] || row['Edificacao'] || row['E'] || ''),
                        disciplina: String(row['Disciplina'] || row['F'] || ''),
                        nomeDocumento: String(nomeDoc || ''),
                        formato: formato,
                        isModelo: (isModeloRaw === 'sim' || isModeloRaw === '1' || isModeloRaw === 'verdadeiro') ? 1 : 0,
                        descricao: row['Observações'] || row['Observacao'] || null,
                        // Status automático: se tem data, está recebido
                        status: dataEnt ? 'RECEBIDO' : 'AGUARDANDO',
                        tipoDocumento: (formato === 'rvt' || formato === 'ifc') ? 'rvt' : 'relatorio'
                    });
                }
            });
        }

        return { salas, apontamentos, entregas };
    } catch (error) {
        console.error('Error processing Excel file:', error);
        throw new Error('Failed to process Excel file');
    }
}
