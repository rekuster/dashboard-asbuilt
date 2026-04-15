
import { getApontamentosPorSemana } from "../server/db.ts";

async function test() {
    try {
        console.log("Testing getApontamentosPorSemana with 'Prédio Produção'...");
        const data = await getApontamentosPorSemana("Prédio Produção");
        console.log("RESULT_START");
        console.log(JSON.stringify(data, null, 2));
        console.log("RESULT_END");
        
        const hasIllegalLabels = data.some(d => !/^\d{4}-W\d{2}$/.test(d.semana));
        console.log("Has illegal labels:", hasIllegalLabels);
        
        if (!hasIllegalLabels && data.length > 0) {
            console.log("SUCCESS: All labels are in YYYY-WXX format.");
        }
    } catch (err) {
        console.error("ERROR_START");
        console.error(err);
        console.error("ERROR_END");
    }
    process.exit(0);
}

test();
