const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function repopulateEntregas() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        console.log('--- Fazendo cópia do Escopo para Entregas para não ficar vazio ---');
        
        const escopos = await sql`SELECT * FROM "escopoAsBuilt"`;
        console.log(`Encontrados ${escopos.length} itens no escopo.`);
        
        let count = 0;
        for (const esc of escopos) {
            // Create a record in entregasAsBuilt for each item in escopo
            await sql`
                INSERT INTO "entregasAsBuilt" (
                    "projectId", "escopoId", "nomeDocumento", "tipoDocumento", 
                    "edificacao", "disciplina", "empresaResponsavel", 
                    "dataPrevista", "status", "identificadorEntrega", "formato", "isModelo", "createdAt", "updatedAt"
                ) VALUES (
                    ${esc.projectId}, ${esc.id}, ${esc.nomeModeloFinal || esc.nomeModelo}, 'rvt', 
                    ${esc.edificacao}, ${esc.disciplina}, ${esc.empresa}, 
                    ${new Date('2026-06-01T12:00:00')}, 'AGUARDANDO', 'Importação Inicial', 'rvt', 1, NOW(), NOW()
                )
            `;
            count++;
        }
        
        console.log(`\nCopiados ${count} registros para a aba Gestão de Entregas.`);
        process.exit(0);
    } catch (err) {
        console.error('Erro ao repopular:', err);
        process.exit(1);
    }
}

repopulateEntregas();
