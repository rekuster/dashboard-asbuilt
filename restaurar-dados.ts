/**
 * SCRIPT DE RESTAURAÇÃO DE EMERGÊNCIA
 * Este script lê a planilha mestre original de salas e restaura os dados no Supabase.
 */

import "dotenv/config";
import fs from "fs";
import { handleExcelUpload } from "./server/uploadHandler";

async function main() {
    const filePath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Relatório de divergencias\\Mapeamento RA-As Built.xlsx";
    
    console.log("--------------------------------------------------");
    console.log("🆘 INICIANDO RESTAURAÇÃO DE EMERGÊNCIA");
    console.log(`📂 Planilha Mestre: ${filePath}`);
    console.log("--------------------------------------------------");
    
    if (!fs.existsSync(filePath)) {
        console.error("❌ ERRO: Não encontrei a planilha mestre original!");
        process.exit(1);
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        console.log("✅ Planilha mestre lida. Restaurando salas e apontamentos...");
        
        // Chamamos o handleExcelUpload que agora tem a Trava de Segurança
        // Ele vai restaurar as salas e apontamentos, mas NÃO vai apagar as entregas
        // que acabamos de subir, pois esta planilha não tem a aba de entregas.
        const result = await handleExcelUpload(fileBuffer, "Mapeamento RA-As Built.xlsx");
        
        if (result.success) {
            console.log("\n--------------------------------------------------");
            console.log("✨ RESTAURAÇÃO CONCLUÍDA!");
            console.log(`- Salas restauradas: ${result.totalSalas}`);
            console.log(`- Apontamentos restaurados: ${result.totalApontamentos}`);
            console.log("--------------------------------------------------");
        }
    } catch (error) {
        console.error("❌ FALHA NA RESTAURAÇÃO:", error);
    }
    
    process.exit(0);
}

main();
