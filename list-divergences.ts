
import "dotenv/config";
import { getDb, escopoAsBuilt, entregasAsBuilt } from './server/db';
import { eq, and, isNull } from 'drizzle-orm';

async function listDivergences() {
    console.log("Iniciando busca de divergências...");
    const db = await getDb();
    if (!db) {
        console.error("ERRO: Não foi possível conectar ao banco de dados. Verifique o arquivo .env");
        process.exit(1);
    }

    try {
        // Busca todos os escopos que a Thá diz ter postado
        const escoposTha = await db.select().from(escopoAsBuilt)
            .where(eq(escopoAsBuilt.statusTha, 'POSTADO'));

        console.log(`\n=== RELATÓRIO DE DIVERGÊNCIAS (THÁ) ===\n`);
        console.log(`Total de modelos que a Thá reporta como 'POSTADO': ${escoposTha.length}\n`);

        let countDivergente = 0;
        
        for (const escopo of escoposTha) {
            // Verifica se existe alguma entrega VALIDADA para este escopo
            const entregas = await db.select().from(entregasAsBuilt)
                .where(and(
                    eq(entregasAsBuilt.escopoId, escopo.id),
                    eq(entregasAsBuilt.status, 'VALIDADO')
                ));

            if (entregas.length === 0) {
                countDivergente++;
                console.log(`[DIVERGENTE]`);
                console.log(`- Edificação: ${escopo.edificacao}`);
                console.log(`- Disciplina: ${escopo.disciplina}`);
                console.log(`- Modelo: ${escopo.nomeModeloFinal || escopo.nomeModelo}`);
                console.log(`- Status Planilha Thá: ${escopo.statusTha}`);
                console.log(`- Obs Thá: ${escopo.obsTha || 'Sem observações'}`);
                console.log(`------------------------------------------`);
            }
        }

        console.log(`\nTotal de Divergências: ${countDivergente}`);

        // O que falta (nem Thá, nem nós)
        const faltantes = await db.select().from(escopoAsBuilt)
            .where(and(
                isNull(escopoAsBuilt.statusTha),
                eq(escopoAsBuilt.ativo, 1)
            ));

        console.log(`\n=== O QUE FALTA (NÃO REPORTADO PELA THÁ) ===\n`);
        
        const porEdif: Record<string, string[]> = {};
        faltantes.forEach((f: any) => {
            if (!porEdif[f.edificacao]) porEdif[f.edificacao] = [];
            porEdif[f.edificacao].push(`${f.disciplina}: ${f.nomeModeloFinal || f.nomeModelo}`);
        });

        for (const [edif, lista] of Object.entries(porEdif)) {
            console.log(`\n> ${edif} (${lista.length} modelos):`);
            lista.forEach(item => console.log(`  - ${item}`));
        }

    } catch (err) {
        console.error("Erro durante a execução:", err);
    } finally {
        // close connection properly if possible
        process.exit(0);
    }
}

listDivergences();
