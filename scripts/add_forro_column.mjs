import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.mwjgsaurifctbatsindf:stecla387205@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require';

const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 1 });

try {
    console.log('Conectando ao banco de dados...');
    
    // Adiciona a coluna temForro caso ainda não exista
    await sql`
        ALTER TABLE salas 
        ADD COLUMN IF NOT EXISTS "temForro" integer DEFAULT 0
    `;
    
    console.log('✅ Coluna temForro adicionada com sucesso!');
    
    // Verificar resultado
    const result = await sql`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'salas' AND column_name = 'temForro'
    `;
    console.log('Coluna no banco:', result);
    
} catch (err) {
    console.error('❌ Erro:', err.message);
} finally {
    await sql.end();
    process.exit(0);
}
