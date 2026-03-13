
import "dotenv/config";
import ExcelJS from "exceljs";
import { getDb, escopoAsBuilt, projects } from "./server/db.ts";
import { eq, and } from "drizzle-orm";

/**
 * Este script importa a Lista Mestra de modelos as-built a partir da planilha do usuário.
 * Ele agrupa múltiplos modelos de projeto no mesmo Modelo Final as-built, conforme solicitado.
 * Também rastreia se o modelo original possui .rvt.
 */

async function importMasterList() {
    const filePath = "D:\\STECLA IA\\Dashboard-AsBuilt-Custom\\Planilhas\\Mapeamento RA-As Built.xlsx";
    console.log(`📂 Lendo planilha: ${filePath}`);

    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(filePath);
    } catch (err) {
        console.error("❌ Erro ao ler a planilha. Verifique se o caminho está correto.");
        process.exit(1);
    }

    const sheet = workbook.getWorksheet("Mapeamento Modelos As Built");
    if (!sheet) {
        console.error("❌ Aba 'Mapeamento Modelos As Built' não encontrada!");
        process.exit(1);
    }

    const db = await getDb();
    if (!db) {
        console.error("❌ Não foi possível conectar ao banco de dados.");
        process.exit(1);
    }

    // Buscar o projeto ativo (pegaremos o primeiro para simplificar ou o que tiver)
    const allProjects = await db.select().from(projects);
    if (allProjects.length === 0) {
        console.warn("⚠️ Nenhum projeto encontrado no banco. Tentando prosseguir sem projectId...");
    }
    const projectId = allProjects[0]?.id;

    console.log("🚀 Iniciando processamento...");

    // Mapa para consolidar modelos finais
    // Key: Modelo Final
    const consolidado = new Map<string, any>();

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Pular cabeçalho

        const edificacao = row.getCell(2).value?.toString();
        const disciplina = row.getCell(3).value?.toString();
        const modeloBase = row.getCell(4).value?.toString();
        const possuiRvt = row.getCell(6).value === true || row.getCell(6).value === 'TRUE' || row.getCell(6).value === 1;
        const responsavel = row.getCell(8).value?.toString() || "Não informado";
        const modeloFinal = row.getCell(10).value?.toString();

        if (!modeloFinal || !edificacao) return;

        if (!consolidado.has(modeloFinal)) {
            consolidado.set(modeloFinal, {
                projectId,
                edificacao,
                disciplina,
                nomeModelo: modeloBase, // Guardamos o primeiro como referência
                nomeModeloFinal: modeloFinal,
                empresa: responsavel,
                temRvtOriginal: possuiRvt ? 1 : 0,
                baseModels: [modeloBase],
                pendenciaRvt: possuiRvt ? "OK" : "Pendente (Verificar base)"
            });
        } else {
            const item = consolidado.get(modeloFinal);
            item.baseModels.push(modeloBase);
            // Se qualquer um dos modelos base não tiver RVT, mantemos como pendente? 
            // Ou se PELO MENOS UM tiver, é parcial?
            // Vamos logar que é um modelo composto.
            if (!possuiRvt) item.temRvtOriginal = 0; 
        }
    });

    console.log(`📦 Encontrados ${consolidado.size} modelos finais consolidados.`);

    let created = 0;
    let updated = 0;

    for (const item of consolidado.values()) {
        const { baseModels, ...data } = item;
        data.descricao = `Consolidação de: ${baseModels.join(", ")}`;

        // Verificar se já existe
        const existing = await db.select().from(escopoAsBuilt)
            .where(and(
                eq(escopoAsBuilt.nomeModeloFinal, data.nomeModeloFinal),
                eq(escopoAsBuilt.edificacao, data.edificacao)
            ))
            .limit(1);

        if (existing.length > 0) {
            await db.update(escopoAsBuilt).set({
                ...data,
                updatedAt: new Date()
            }).where(eq(escopoAsBuilt.id, existing[0].id));
            updated++;
        } else {
            await db.insert(escopoAsBuilt).values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            created++;
        }
    }

    console.log(`✅ Importação concluída! Criados: ${created}, Atualizados: ${updated}`);
    process.exit(0);
}

importMasterList();
