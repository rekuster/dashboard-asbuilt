import Database from "better-sqlite3";

const db = new Database("sqlite.db");
const columns = db.pragma("table_info(salas)");
console.log("Columns in 'salas' table:", columns.map((c: any) => c.name));
