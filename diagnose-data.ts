import "dotenv/config";
import Database from "better-sqlite3";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import path from "path";
import fs from "fs";

// 1. Check Local SQLite
const db = new Database("sqlite.db");
const countResult: any = db.prepare("SELECT count(*) as count FROM apontamentos").get();
console.log(`📊 Local SQLite Apontamentos: ${countResult.count}`);

// 2. Check Excel Sheets
const DIR = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Relatório de divergencias";
const FILENAME = "Mapeamento RA-As Built.xlsx";
const EXCEL_PATH = path.join(DIR, FILENAME);

if (fs.existsSync(EXCEL_PATH)) {
    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log(`📂 Excel Sheets found: ${workbook.SheetNames.join(", ")}`);
} else {
    console.log("❌ Excel file not found for sheet check.");
}
