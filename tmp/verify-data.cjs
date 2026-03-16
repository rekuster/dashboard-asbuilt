const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verify() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT "numeroEntrega", "identificadorEntrega", "nomeDocumento", "empresaResponsavel" FROM "entregasAsBuilt" ORDER BY "numeroEntrega" ASC LIMIT 5`;
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
