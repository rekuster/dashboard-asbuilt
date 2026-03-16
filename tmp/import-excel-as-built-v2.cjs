const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("DATABASE_URL não encontrada no .env.local");
    process.exit(1);
}

const sql = postgres(dbUrl);
const excelPath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx";

async function importData() {
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`Lendo ${rows.length} linhas da planilha: ${sheetName}`);

        let importedCount = 0;
        for (const row of rows) {
            const empresa = row['Responsável'];
            const disciplina = row['Disciplina'];
            const edificacao = row['Edificação'];
            const nomeDoc = row['Modelo Final'] || row['Modelo Base'];
            const modeloBase = row['Modelo Base'];
            const temRevit = row['Revit'] === true || row['Revit'] === "true" || row['Revit'] === 1;
            const temIfc = row['IFC'] === true || row['IFC'] === "true" || row['IFC'] === 1;
            const numero = row['Número'];
            
            if (!empresa || !nomeDoc) continue;

            const formato = temRevit ? "rvt" : (temIfc ? "ifc" : "dwg");
            const isModelo = (temRevit || temIfc) ? 1 : 0;

            // Manual check for existing record to avoid unique constraint issues if index is missing
            const existing = await sql`
                SELECT id FROM "entregasAsBuilt" 
                WHERE "nomeDocumento" = ${nomeDoc} 
                AND "empresaResponsavel" = ${empresa}
                LIMIT 1
            `;

            if (existing.length > 0) {
                // Update
                await sql`
                    UPDATE "entregasAsBuilt" SET
                        "edificacao" = ${edificacao || "Geral"},
                        "disciplina" = ${disciplina || "Coordenação"},
                        "formato" = ${formato},
                        "isModelo" = ${isModelo},
                        "modeloBaseReferencia" = ${modeloBase || null},
                        "identificadorEntrega" = ${numero ? "SM " + numero : null},
                        "dataPrevista" = COALESCE("dataPrevista", NOW())
                    WHERE id = ${existing[0].id}
                `;
            } else {
                // Insert
                await sql`
                    INSERT INTO "entregasAsBuilt" (
                        "nomeDocumento", "tipoDocumento", "edificacao", "disciplina", 
                        "empresaResponsavel", "status", "dataPrevista",
                        "formato", "isModelo", 
                        "modeloBaseReferencia", "identificadorEntrega", "checkpointBep", "createdAt"
                    ) VALUES (
                        ${nomeDoc}, ${formato}, ${edificacao || "Geral"}, ${disciplina || "Coordenação"},
                        ${empresa}, 'AGUARDANDO', NOW(),
                        ${formato}, ${isModelo},
                        ${modeloBase || null}, ${numero ? "SM " + numero : null}, '{}', NOW()
                    )
                `;
            }
            importedCount++;
        }

        console.log(`Importação concluída: ${importedCount} registros processados.`);
        process.exit(0);
    } catch (e) {
        console.error("Erro na importação:", e);
        process.exit(1);
    }
}

importData();
