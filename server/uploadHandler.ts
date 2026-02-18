import { sql } from 'drizzle-orm';
import { getDb, salas, apontamentos, uploads } from './db';
import { processExcelFile } from './excelProcessor';

export async function handleExcelUpload(fileBuffer: Buffer, fileName: string = 'upload.xlsx', uploadedBy: number = 1): Promise<{
    success: boolean;
    totalSalas: number;
    totalApontamentos: number;
}> {
    try {
        const { salas: salasData, apontamentos: apontamentosData } = await processExcelFile(fileBuffer);

        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        // Backup existing IFC mappings (linking nome -> ifcExpressId)
        const existingSalas = await db.select({ nome: salas.nome, ifcExpressId: salas.ifcExpressId }).from(salas);
        const mappingBackup = new Map<string, string>();
        existingSalas.forEach(s => {
            if (s.ifcExpressId && s.nome) {
                mappingBackup.set(s.nome, s.ifcExpressId);
            }
        });

        // Clear existing data
        try {
            await db.delete(apontamentos);
            await db.delete(salas);
        } catch (delError) {
            console.log("Delete failed, likely empty or permissions. Attempting with where clause...");
            await db.delete(apontamentos).where(sql`1 = 1`);
            await db.delete(salas).where(sql`1 = 1`);
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
        };
    } catch (error) {
        console.error('Error handling Excel upload:', error);
        throw error;
    }
}
