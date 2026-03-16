const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function checkData() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        const escopos = await sql`SELECT id, "nomeModeloFinal", status FROM "escopoAsBuilt"`;
        console.log('Escopo status count:');
        const statusMap = {};
        escopos.forEach(e => {
            statusMap[e.status] = (statusMap[e.status] || 0) + 1;
            if (e.status !== 'PENDENTE') {
                console.log(`- ${e.nomeModeloFinal}: ${e.status}`);
            }
        });
        console.log(statusMap);
        
        const entregas = await sql`SELECT count(*) FROM "entregasAsBuilt"`;
        console.log(`\nEntregas count: ${entregas[0].count}`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
