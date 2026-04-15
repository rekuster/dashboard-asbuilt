
import { getApontamentosPorSemana } from "./server/db.js";

async function test() {
    try {
        console.log("Testing getApontamentosPorSemana with 'Prédio Produção'...");
        const data = await getApontamentosPorSemana("Prédio Produção");
        console.log("RESULT_START");
        console.log(JSON.stringify(data, null, 2));
        console.log("RESULT_END");
        
        const hasDisciplines = data.some(d => !/^\d{4}-W\d{2}$/.test(d.semana));
        console.log("Has illegal labels:", hasDisciplines);
    } catch (err) {
        console.error("ERROR_START");
        console.error(err);
        console.error("ERROR_END");
    }
    process.exit(0);
}

test();
