import { sql, eq } from 'drizzle-orm';
import { getDb, salas, apontamentos, uploads, entregasAsBuilt } from './db';
import { processExcelFile } from './excelProcessor';

/**
 * EXPLICAÇÃO PARA O USUÁRIO:
 * Este arquivo cuida do processo de "limpeza e troca" de dados. 
 * Quando você envia uma planilha nova, ele apaga os dados antigos das salas e entregas 
 * e coloca os dados novos da planilha, garantindo que o Dashboard esteja sempre atualizado com o seu Excel.
 */

export async function handleExcelUpload(fileBuffer: Buffer, fileName: string = 'upload.xlsx', uploadedBy: number = 1): Promise<{
    success: boolean;
    totalSalas: number;
    totalApontamentos: number;
    totalEntregas?: number;
}> {
    try {
        const { salas: salasData, apontamentos: apontamentosData, entregas: entregasData } = await processExcelFile(fileBuffer);

        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        // Backup existing IFC mappings (linking nome -> ifcExpressId)
        const existingSalas = await db.select({ nome: salas.nome, ifcExpressId: salas.ifcExpressId }).from(salas);
        const mappingBackup = new Map<string, string>();
        existingSalas.forEach((s: any) => {
            if (s.ifcExpressId && s.nome) {
                mappingBackup.set(s.nome, s.ifcExpressId);
            }
        });

        // Clear existing data - Limpamos tudo para garantir que o Excel seja a única fonte da verdade
        try {
            await db.delete(apontamentos);
            await db.delete(salas);
            if (entregasData && entregasData.length > 0) {
                await db.delete(entregasAsBuilt);
            }
        } catch (delError) {
            console.log("Delete failed, likely empty or permissions. Attempting with where clause...");
            await db.delete(apontamentos).where(sql`1 = 1`);
            await db.delete(salas).where(sql`1 = 1`);
            if (entregasData && entregasData.length > 0) {
                await db.delete(entregasAsBuilt).where(sql`1 = 1`);
            }
        }

        // Insert salas in chunks
        if (salasData.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < salasData.length; i += chunkSize) {
                const chunk = salasData.slice(i, i + chunkSize);

                // RESTORE MAPPINGS: Apply backed-up IDs to new data
                const enrichedChunk = chunk.map(sala => ({
                    ...sala,
                    ifcExpressId: mappingBackup.get(sala.nome) || null
                }));

                await db.insert(salas).values(enrichedChunk);
            }
        }

        // Insert apontamentos in chunks
        if (apontamentosData.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < apontamentosData.length; i += chunkSize) {
                const chunk = apontamentosData.slice(i, i + chunkSize);
                await db.insert(apontamentos).values(chunk);
            }
        }

        // NOVO: Inserir Entregas As-Built (Lista Mestra)
        if (entregasData && entregasData.length > 0) {
            const chunkSize = 50;
            for (let i = 0; i < entregasData.length; i += chunkSize) {
                const chunk = entregasData.slice(i, i + chunkSize);
                await db.insert(entregasAsBuilt).values(chunk);
            }
        }

        // Record upload
        await db.insert(uploads).values({
            fileName,
            fileSize: fileBuffer.length,
            uploadedBy,
            totalSalas: salasData.length,
            totalApontamentos: apontamentosData.length,
            status: 'PROCESSADO',
        });

        return {
            success: true,
            totalSalas: salasData.length,
            totalApontamentos: apontamentosData.length,
            totalEntregas: entregasData?.length || 0
        };
    } catch (error) {
        console.error('Error handling Excel upload:', error);
        throw error;
    }
}
