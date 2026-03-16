const { getApontamentosPorSemana, closeDb } = require('../server/db');

async function test() {
    try {
        console.log("Testing getApontamentosPorSemana...");
        const data = await getApontamentosPorSemana();
        console.log("Result:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error testing:", error);
    } finally {
        await closeDb();
    }
}

test();
