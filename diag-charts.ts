import { getApontamentosPorSemana, getApontamentosPorDisciplina } from "./server/db";

async function diag() {
    console.log("--- Diagnóstico de Dados de Gráficos ---");

    console.log("Chamando getApontamentosPorDisciplina...");
    const disc = await getApontamentosPorDisciplina();
    console.log("Resultado Disciplinas (amostra 1):", disc[0]);
    if (disc.length > 0 && typeof disc[0].count !== 'number') {
        console.error("ERRO: count de disciplina não é número!", typeof disc[0].count);
    } else {
        console.log("SUCESSO: count de disciplina é número.");
    }

    console.log("Chamando getApontamentosPorSemana...");
    const semana = await getApontamentosPorSemana();
    console.log("Resultado Semana (todas):", JSON.stringify(semana));

    const week02 = semana.find(s => s.semana.includes("W02"));
    if (week02) {
        console.log(`Semana 02 encontrada: Apontamentos=${week02.count}, Salas=${week02.verifiedRooms}`);
        if (week02.verifiedRooms === 0) {
            console.warn("AVISO: Salas Verificadas na Semana 02 continua sendo 0!");
        }
    } else {
        console.warn("AVISO: Semana 02 não encontrada no cronograma!");
    }

    console.log("--- Fim do Diagnóstico ---");
    process.exit(0);
}

diag().catch(console.error);
