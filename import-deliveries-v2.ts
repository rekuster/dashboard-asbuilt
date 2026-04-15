import "dotenv/config";
import fs from "fs";
import path from "path";
import { handleExcelUpload } from "./server/uploadHandler";

/**
 * ESTE SCRIPT REALIZA A CARGA MANUAL DAS ENTREGAS.
 * Ele lê o arquivo Excel no caminho correto e força a atualização do sistema.
 */

async function main() {
    const filePath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento Modelos As Built.xlsx";
    
    console.log(`📂 Iniciando importação manual de: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.error("❌ ERRO: Arquivo não encontrado no caminho especificado.");
        console.error("Caminho tentado: " + filePath);
        process.exit(1);
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        console.log("📄 Arquivo lido com sucesso. Processando...");
        
        const result = await handleExcelUpload(fileBuffer, "Mapeamento Modelos As Built.xlsx");
        
        if (result.success) {
            console.log("\n✅ SUCESSO!");
            console.log(`- Salas processadas: ${result.totalSalas}`);
            console.log(`- Apontamentos: ${result.totalApontamentos}`);
            console.log(`- Entregas (Lista Mestra): ${result.totalEntregas}`);
        }
    } catch (error) {
        console.error("❌ FALHA na importação:", error);
    }
    
    process.exit(0);
}

main();
