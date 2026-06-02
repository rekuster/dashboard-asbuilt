import postgres from 'postgres';

async function testDirectConnection() {
    const directUrl = "postgresql://postgres.mwjgsaurifctbatsindf:stecla387205@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require";
    
    console.log("🔌 Tentando conexão direta com Supabase na porta padrão 5432...");
    const client = postgres(directUrl, {
        ssl: { rejectUnauthorized: false },
        connect_timeout: 10
    });

    try {
        console.time("⏰ Tempo de resposta");
        const res = await client.unsafe('SELECT count(*) from "salas";');
        console.timeEnd("⏰ Tempo de resposta");
        console.log("✅ Conexão bem-sucedida! Total de salas:", res[0].count);
    } catch (err: any) {
        console.error("❌ Falha na conexão direta:", err.message);
    } finally {
        await client.end();
        console.log("🔌 Conexão encerrada.");
    }
}

testDirectConnection();
