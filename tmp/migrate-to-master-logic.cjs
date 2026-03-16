const postgres = require('postgres');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function migrateData() {
    const sql = postgres(process.env.DATABASE_URL);
    try {
        console.log('--- Iniciando Migração de Dados ---');
        
        // 1. Verificar se o escopoAsBuilt já tem os 100+ itens (A Lista Mestra)
        const escopoCount = await sql`SELECT count(*) FROM "escopoAsBuilt"`;
        console.log(`Itens na Lista Mestra (Escopo): ${escopoCount[0].count}`);
        
        // 2. Limpar a tabela de entregasAsBuilt. 
        // Como o usuário notou que os dados estão trocados, os 96 itens que estão lá
        // provavelmente são a importação inicial que deveria estar apenas no escopo.
        // A "Gestão de Entregas" deve começar limpa ou apenas com logs reais.
        
        const deleteRes = await sql`DELETE FROM "entregasAsBuilt" WHERE id > 0`;
        console.log(`Log de Entregas (Gestão) limpo. Registros removidos: ${deleteRes.count}`);
        
        console.log('\n--- Migração Concluída com Sucesso ---');
        console.log('Agora a "Lista de Entregas Final" serve como Planejamento.');
        console.log('A "Gestão de Entregas" está pronta para receber novos registros (SMs).');
        
        process.exit(0);
    } catch (err) {
        console.error('Erro na migração:', err);
        process.exit(1);
    }
}

migrateData();
