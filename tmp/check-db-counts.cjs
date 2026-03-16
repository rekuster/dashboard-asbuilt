const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function checkCounts() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        const escopoCount = await sql`SELECT count(*) FROM "escopoAsBuilt"`;
        const entregaCount = await sql`SELECT count(*) FROM "entregasAsBuilt"`;
        console.log(`escopoAsBuilt: ${escopoCount[0].count}`);
        console.log(`entregasAsBuilt: ${entregaCount[0].count}`);
        
        console.log('\n--- Sample Escopo ---');
        const lastEscopos = await sql`SELECT "empresa", "disciplina", "edificacao", "nomeModeloFinal" FROM "escopoAsBuilt" LIMIT 5`;
        console.log(lastEscopos);

        console.log('\n--- Sample Entregas ---');
        const lastEntregas = await sql`SELECT "nomeDocumento", "identificadorEntrega", "empresaResponsavel" FROM "entregasAsBuilt" LIMIT 5`;
        console.log(lastEntregas);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCounts();
