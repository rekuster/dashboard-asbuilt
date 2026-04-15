/**
 * EXPLICAÇÃO PARA O USUÁRIO (LEIGO):
 * Este script é como um "carregador de elite". Ele vai até o seu Excel no disco D:, 
 * pega as 109 entregas e as coloca diretamente no sistema do dashboard.
 * Ele limpa o que tinha antes para garantir que nada fique duplicado e que o sistema
 * seja um espelho fiel da sua planilha.
 */

import "dotenv/config";
import fs from "fs";
import { handleExcelUpload } from "./server/uploadHandler";

async function main() {
    // Definimos o caminho exato que você confirmou no disco D:
    const filePath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx";
    
    console.log("--------------------------------------------------");
    console.log("🚀 INICIANDO CARGA FORÇADA DE ENTREGAS");
    console.log(`📂 Caminho: ${filePath}`);
    console.log("--------------------------------------------------");
    
    // Verificamos se o arquivo realmente existe antes de tentar ler
    if (!fs.existsSync(filePath)) {
        console.error("❌ ERRO: Não encontrei a planilha no caminho acima!");
        console.error("DICA: Verifique se o pendrive ou HD externo está conectado e se o nome da pasta mudou.");
        process.exit(1);
    }

    try {
        // Lemos o arquivo para a memória do computador
        const fileBuffer = fs.readFileSync(filePath);
        console.log("✅ Planilha lida. Agora vou limpar o sistema e subir os novos dados...");
        
        // Chamamos a função que faz a "mágica" de apagar o velho e colocar o novo
        const result = await handleExcelUpload(fileBuffer, "Mapeamento Modelos As Built.xlsx");
        
        if (result.success) {
            console.log("\n--------------------------------------------------");
            console.log("✨ SUCESSO ABSOLUTO!");
            console.log(`- Salas sincronizadas: ${result.totalSalas}`);
            console.log(`- Alertas/Apontamentos: ${result.totalApontamentos}`);
            console.log(`- Entregas (Lista Mestra): ${result.totalEntregas}`);
            console.log("--------------------------------------------------");
            console.log("DICA: Agora você já pode abrir o Dashboard e ver os 109 itens!");
        }
    } catch (error) {
        console.error("❌ OCORREU UM PROBLEMA:", error);
        console.log("DICA: Feche a planilha no Excel e tente rodar este script novamente.");
    }
    
    process.exit(0);
}

// Iniciamos a execução do script acima
main();
