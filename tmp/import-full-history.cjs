const ExcelJS = require('exceljs');
const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const excelPath = 'D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx';
const PROJECT_ID = '8b821385-8648-4922-ba69-5e7357e2ab3e';

function getVal(cell) {
    if (!cell.value) return null;
    if (typeof cell.value === 'object' && cell.value.result !== undefined) {
        return cell.value.result;
    }
    return cell.value;
}

async function importFullHistory() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        console.log('--- Iniciando Importação Completa (Versão com Fórmulas) ---');
        
        await sql`DELETE FROM "entregasAsBuilt"`;
        await sql`DELETE FROM "entregasHistorico"`;
        
        const escopos = await sql`SELECT id, empresa, edificacao, disciplina, "nomeModeloFinal" FROM "escopoAsBuilt"`;
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        const worksheet = workbook.getWorksheet('Mapeamento Entrega As Built');

        let count = 0;
        const rows = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const num = getVal(row.getCell(1));
            const data = getVal(row.getCell(2));
            const entregaLabel = getVal(row.getCell(3));
            const responsavel = getVal(row.getCell(4));
            const edificacao = getVal(row.getCell(5));
            const disciplina = getVal(row.getCell(6));
            const arquivo = getVal(row.getCell(7));
            const formato = getVal(row.getCell(8));
            const isModeloRaw = getVal(row.getCell(9));
            const modeloBase = getVal(row.getCell(10));
            const modeloFinal = getVal(row.getCell(11));
            const observacoes = getVal(row.getCell(12));
            const acao = getVal(row.getCell(13));

            if (!arquivo) return;

            let escopoId = null;
            if (modeloFinal) {
                const match = escopos.find(e => 
                    e.nomeModeloFinal && e.nomeModeloFinal.toLowerCase().trim() === String(modeloFinal).toLowerCase().trim()
                );
                if (match) escopoId = match.id;
            }

            if (!escopoId && responsavel && edificacao && disciplina) {
                const match = escopos.find(e => 
                    e.empresa.toLowerCase().trim() === String(responsavel).toLowerCase().trim() &&
                    e.edificacao.toLowerCase().trim() === String(edificacao).toLowerCase().trim() &&
                    e.disciplina.toLowerCase().trim() === String(disciplina).toLowerCase().trim()
                );
                if (match) escopoId = match.id;
            }

            rows.push({
                numeroEntrega: parseInt(num) || 0,
                dataRecebimento: data instanceof Date ? data : (data ? new Date(data) : null),
                identificadorEntrega: String(entregaLabel || ''),
                empresaResponsavel: String(responsavel || 'Desconhecido'),
                edificacao: String(edificacao || 'Geral'),
                disciplina: String(disciplina || 'Geral'),
                nomeDocumento: String(arquivo),
                tipoDocumento: String(formato || 'relatorio').toLowerCase().includes('rvt') ? 'rvt' : 'relatorio',
                formato: String(formato || ''),
                isModelo: String(isModeloRaw).toLowerCase() === 'sim' ? 1 : 0,
                modeloBaseReferencia: String(modeloBase || ''),
                acoesNecessarias: String(acao || ''),
                descricao: String(observacoes || ''),
                escopoId: escopoId,
                status: 'RECEBIDO',
                projectId: PROJECT_ID
            });
        });

        console.log(`Dados processados: ${rows.length} linhas enviando para o banco...`);

        for (const item of rows) {
            await sql`
                INSERT INTO "entregasAsBuilt" (
                    "projectId", "escopoId", "numeroEntrega", "nomeDocumento", "tipoDocumento", 
                    "edificacao", "disciplina", "empresaResponsavel", "dataPrevista", "dataRecebimento",
                    "status", "identificadorEntrega", "formato", "isModelo", "modeloBaseReferencia", 
                    "acoesNecessarias", "descricao", "createdAt", "updatedAt"
                ) VALUES (
                    ${item.projectId}, ${item.escopoId}, ${item.numeroEntrega}, ${item.nomeDocumento}, ${item.tipoDocumento},
                    ${item.edificacao}, ${item.disciplina}, ${item.empresaResponsavel}, ${item.dataRecebimento || new Date()}, ${item.dataRecebimento},
                    ${item.status}, ${item.identificadorEntrega}, ${item.formato}, ${item.isModelo}, ${item.modeloBaseReferencia},
                    ${item.acoesNecessarias}, ${item.descricao}, NOW(), NOW()
                )
            `;
            count++;
        }

        console.log(`\nImportação concluída: ${count} registros inseridos.`);
        process.exit(0);
    } catch (err) {
        console.error('Erro na importação:', err);
        process.exit(1);
    }
}

importFullHistory();
