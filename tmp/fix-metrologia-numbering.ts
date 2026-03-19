/*
 * Script de correção: move os apontamentos da Metrologia A (data 18/03/2026)
 * para o final da numeração sequencial do projeto, preenchendo os buracos.
 *
 * Executa: npx tsx tmp/fix-metrologia-numbering.ts
 */

import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL não encontrada no .env");
    process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function fixNumbering() {
    try {
        // 1. Busca todos os apontamentos da Metrologia A do dia 18/03/2026
        const metrologiaA = await sql`
            SELECT id, "numeroApontamento", sala, data::date, disciplina
            FROM apontamentos
            WHERE sala = 'Metrologia A'
              AND data::date = '2026-03-18'
            ORDER BY "numeroApontamento"
        `;

        if (metrologiaA.length === 0) {
            console.log("Nenhum apontamento encontrado para Metrologia A em 18/03.");
            await sql.end();
            return;
        }

        console.log(`\n📋 Apontamentos da Metrologia A (18/03) encontrados: ${metrologiaA.length}`);
        metrologiaA.forEach(a => console.log(`  #${a.numeroApontamento} - ${a.disciplina}`));

        // 2. Busca o MAX atual de toda a tabela (excluindo os da Metrologia A para não contar os duplicados)
        const [{ max_num }] = await sql`
            SELECT COALESCE(MAX("numeroApontamento"), 0) as max_num
            FROM apontamentos
            WHERE NOT (sala = 'Metrologia A' AND data::date = '2026-03-18')
        `;

        const startingNum = Number(max_num) + 1;
        console.log(`\n🔢 Numeração começa a partir de: ${startingNum}`);

        // 3. Atualiza cada apontamento da Metrologia A com um número temporário negativo
        //    para evitar conflito de unique constraint durante a reatribuição
        for (const ap of metrologiaA) {
            await sql`
                UPDATE apontamentos
                SET "numeroApontamento" = ${-(ap.id)}
                WHERE id = ${ap.id}
            `;
        }

        // 4. Reatribui os números finais em sequência
        for (let i = 0; i < metrologiaA.length; i++) {
            const newNum = startingNum + i;
            await sql`
                UPDATE apontamentos
                SET "numeroApontamento" = ${newNum}
                WHERE id = ${metrologiaA[i].id}
            `;
            console.log(`  ✅ ID ${metrologiaA[i].id} (${metrologiaA[i].disciplina}): #${metrologiaA[i].numeroApontamento} → #${newNum}`);
        }

        // 5. Verifica resultado final
        const final = await sql`
            SELECT id, "numeroApontamento", sala, disciplina
            FROM apontamentos
            WHERE sala = 'Metrologia A' AND data::date = '2026-03-18'
            ORDER BY "numeroApontamento"
        `;
        console.log("\n✅ Resultado final:");
        final.forEach(a => console.log(`  #${a.numeroApontamento} - ${a.disciplina}`));

        await sql.end();
        console.log("\n🎉 Correção concluída com sucesso!");
    } catch (err) {
        console.error("❌ Erro:", err);
        await sql.end();
        process.exit(1);
    }
}

fixNumbering();
