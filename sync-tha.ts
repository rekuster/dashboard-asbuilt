
import ExcelJS from 'exceljs';
import path from 'path';
import { getDb, escopoAsBuilt } from './server/db';
import { eq, sql, and } from 'drizzle-orm';

async function syncThaData() {
    console.log('--- Iniciando Sincronização Inteligente (Heurística) ---');
    
    const db = await getDb();
    if (!db) return;

    const filePath = path.resolve('Planilhas', 'As_Built_Status - Controle de Entregas - R07.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('Controle de Entregas');
    if (!sheet) return;

    let updatedCount = 0;
    let notFoundCount = 0;

    const normEdif = (val: any) => {
        if (!val) return '';
        const v = String(val).toUpperCase();
        if (v.includes('PRODUÇÃO')) return 'Prédio Produção';
        if (v.includes('IMPLANTAÇÃO')) return 'Implantação';
        if (v.includes('SUPORTE')) return 'Prédio Suporte';
        if (v.includes('CENTRAL')) return 'Central de Utilidades';
        if (v.includes('ETE')) return 'ETE';
        if (v.includes('PÁTIO')) return 'Central de Utilidades'; // Pátio de Utilidades -> Central
        if (v.includes('PORTARIA')) return 'Portaria';
        if (v.includes('SEDE')) return 'Sede Recreativa';
        return String(val);
    };

    const cleanModelName = (name: string) => {
        if (!name) return '';
        let n = name.split('.')[0];
        n = n.split('-R')[0];
        return n.trim();
    };

    const allEscopos = await db.select().from(escopoAsBuilt);

    for (let i = 14; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const dataTha = row.getCell(2).value; 
        const areaTha = row.getCell(3).value; 
        const modeloBaseTha = row.getCell(4).value; 
        const statusTha = row.getCell(5).value; 
        const modeloFinalTha = row.getCell(6).value; 
        const obsTha = row.getCell(9).value; 

        const baseStr = modeloBaseTha ? String(modeloBaseTha).trim() : '';
        const finalStr = modeloFinalTha ? String(modeloFinalTha).trim() : '';
        const edifNorm = normEdif(areaTha);

        if (!baseStr && !finalStr) continue;

        let target = null;

        // 1. Tentar Match por Nome (Final ou Base)
        const cleanFinal = cleanModelName(finalStr);
        const cleanBase = cleanModelName(baseStr);

        target = allEscopos.find(e => 
            (cleanFinal && e.nomeModeloFinal?.includes(cleanFinal)) || 
            (cleanBase && e.nomeModelo?.includes(cleanBase))
        );

        // 2. Tentar Heurística: Edificação + Disciplina (se houver apenas 1)
        if (!target && edifNorm) {
            // Mapeamento de termos para disciplinas
            const discKeywords: Record<string, string> = {
                'ARQ': 'Arquitetura',
                'DRE': 'Drenagem',
                'PAV': 'Pavimentação',
                'ELE': 'Instalações Elétricas',
                'HID': 'Instalações Hidrossanitárias',
                'CON': 'Estrutura de Concreto',
                'MET': 'Estrutura Metálica',
                'PCI': 'PCI',
                'LOG': 'CFTV e Lógica',
                'CLI': 'Climatização',
                'PIS': 'Piso de Concreto',
                'TER': 'Terraplanagem'
            };

            let matchedDisc = '';
            for (const [key, full] of Object.entries(discKeywords)) {
                if (baseStr.includes(key) || finalStr.includes(key)) {
                    matchedDisc = full;
                    break;
                }
            }

            if (matchedDisc) {
                const candidates = allEscopos.filter(e => 
                    e.edificacao.includes(edifNorm) && e.disciplina.includes(matchedDisc)
                );
                if (candidates.length === 1) {
                    target = candidates[0];
                    console.log(`[Heurística] Match por Edif+Disc: Line ${i} -> ${target.nomeModeloFinal} (${matchedDisc})`);
                }
            }
        }

        if (target) {
            await db.update(escopoAsBuilt).set({
                statusTha: statusTha ? String(statusTha).trim() : null,
                dataAtualizacaoTha: dataTha instanceof Date ? dataTha : null,
                obsTha: obsTha ? String(obsTha).trim() : null,
                modeloBaseTha: baseStr || null,
                updatedAt: new Date()
            }).where(eq(escopoAsBuilt.id, target.id));
            updatedCount++;
        } else {
            console.warn(`[Linha ${i}] Não encontrado: Base="${baseStr}" Final="${finalStr}" (${areaTha})`);
            notFoundCount++;
        }
    }

    console.log(`\n--- Sincronização Finalizada ---`);
    console.log(`Atualizados: ${updatedCount}`);
    console.log(`Não encontrados: ${notFoundCount}`);
}

syncThaData().catch(console.error);
