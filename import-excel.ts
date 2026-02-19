import "dotenv/config";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { sql, eq, and } from "drizzle-orm";
// @ts-ignore
import { getDb, salas, apontamentos } from "./server/db.ts";

// Configuration
const EXCEL_DIR = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Relatório de divergencias";
const FILENAME = "Mapeamento RA-As Built.xlsx";
const EXCEL_PATH = path.join(EXCEL_DIR, FILENAME);

function getCellValue(cell: ExcelJS.Cell) {
    if (!cell.value) return null;
    if (typeof cell.value === 'object' && 'result' in cell.value) {
        return (cell.value as any).result;
    }
    // Handle rich text or hyperlinks if necessary, but usually .value is enough unless formula
    // If it's a shared string or object without result, try text
    if (typeof cell.value === 'object') {
        return cell.text;
    }
    return cell.value;
}

function excelDateToJSDate(serial: number | string | Date): Date {
    if (serial instanceof Date) return serial;
    if (typeof serial === "string") return new Date(serial);
    return new Date(Math.round((Number(serial) - 25569) * 864e5));
}

async function importExcel() {
    console.log("🚀 Starting Import/Sync Process (batchv4 - Robust)...");

    // 1. Verify DB Connection
    console.log("[1/4] Connecting to Database...");
    const db = await getDb();
    if (!db) {
        console.error("❌ Failed to connect to database. Check DATABASE_URL.");
        process.exit(1);
    }
    console.log("✅ Database Connected.");

    // 2. Load Excel
    console.log(`[2/4] Loading Excel: ${FILENAME}...`);
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`❌ File not found at path: ${EXCEL_PATH}`);
        process.exit(1);
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);
    console.log("✅ Workbook Loaded.");

    // 3. Process Salas
    const sheetSalas = workbook.getWorksheet("Mapeamento Salas");
    if (sheetSalas) {
        console.log(`\n[3/4] Processing Salas...`);
        const rows: any[] = [];
        sheetSalas.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Header
            const edificacao = row.getCell(1).text?.trim(); // A: Edificação
            const nomeStr = row.getCell(4).text?.trim();    // D: Sala

            if (edificacao && nomeStr) {
                const dataVerificadaVal = getCellValue(row.getCell(10));

                rows.push({
                    edificacao,
                    nome: nomeStr.replace(/[\r\n]+/g, " "), // Clean name
                    pavimento: row.getCell(2).text?.trim() || "N/A", // B
                    setor: row.getCell(3).text?.trim() || "N/A",     // C
                    numeroSala: row.getCell(5).text?.trim() || "0",  // E
                    augin: (row.getCell(6).value === true || row.getCell(6).text?.toLowerCase() === 'true' || row.getCell(6).value === 1) ? 1 : 0, // F
                    statusRA: row.getCell(9).text?.trim() || null,   // I
                    status: row.getCell(16).text?.trim() || "PENDENTE", // P (16)
                    dataVerificada: dataVerificadaVal ? excelDateToJSDate(dataVerificadaVal as any) : null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        });

        console.log(`📊 Found ${rows.length} rooms. Performing Batch Insert...`);

        const CHUNK_SIZE = 50;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            try {
                await db.insert(salas).values(chunk);
                process.stdout.write(`.`);
            } catch (e: any) {
                console.error(`\n❌ Error inserting sala batch ${i}:`, e.message);
            }
        }
        console.log(`\n✅ Rooms Done.`);
    } else {
        console.warn("⚠️ Sheet 'Mapeamento Salas' not found!");
    }

    // 4. Process Apontamentos
    const sheetApt = workbook.getWorksheet("Apontamentos RA Obra");
    if (sheetApt) {
        console.log(`\n[4/4] Processing Apontamentos...`);
        const rows: any[] = [];

        sheetApt.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Header

            // CORRECT INDICES based on check-headers.ts:
            // 1: Data
            // 2: Número Apontamento
            // 3: Edificação
            const dateVal = getCellValue(row.getCell(1));
            const numVal = getCellValue(row.getCell(2));
            const edificacao = row.getCell(3).text?.trim();

            if (numVal && edificacao) {
                const num = Number(numVal);
                if (isNaN(num)) {
                    console.warn(`⚠️ Row ${rowNumber}: Invalid Apontamento Number '${numVal}' - Skipping`);
                    return;
                }

                rows.push({
                    numeroApontamento: num,
                    data: dateVal ? excelDateToJSDate(dateVal as any) : new Date(),
                    edificacao,
                    pavimento: row.getCell(4).text?.trim() || "N/A", // D
                    setor: row.getCell(5).text?.trim() || "N/A",     // E
                    sala: row.getCell(6).text?.trim() || "Desconhecida", // F
                    disciplina: row.getCell(7).text?.trim() || "Geral",  // G
                    divergencia: row.getCell(8).text?.trim() || "",      // H
                    status: "PENDENTE",
                    // Use generic default values for columns not in Excel
                    fotoUrl: null,
                    fotoReferenciaUrl: null,
                    responsavel: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        });

        console.log(`📊 Found ${rows.length} issues. Performing Batch Insert...`);

        const CHUNK_SIZE = 50;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            try {
                await db.insert(apontamentos).values(chunk);
                process.stdout.write(`.`);
            } catch (e: any) {
                console.error(`\n❌ Error inserting apontamentos batch ${i}:`, e.message);
            }
        }
        console.log(`\n✅ Issues Done.`);
    } else {
        console.warn("⚠️ Sheet 'Apontamentos RA Obra' not found!");
    }

    console.log("\n🎉 ALL DONE.");
    process.exit(0);
}

importExcel().catch(err => {
    console.error("\n❌ Fatal Error:", err);
    process.exit(1);
});
