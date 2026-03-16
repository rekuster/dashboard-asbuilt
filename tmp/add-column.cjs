const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function addColumn() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        console.log('Tentando adicionar coluna numeroEntrega manualmente...');
        await sql`ALTER TABLE "entregasAsBuilt" ADD COLUMN IF NOT EXISTS "numeroEntrega" integer`;
        console.log('Coluna adicionada (ou já existia).');
        process.exit(0);
    } catch (err) {
        console.error('Erro ao adicionar coluna:', err);
        process.exit(1);
    }
}

addColumn();
