import fs from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getDb, ifcFiles } from './db';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ifc');

// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating upload directory:', error);
    }
}

/**
 * Handle IFC file upload
 */
export async function handleIfcUpload(
    fileBuffer: Buffer,
    fileName: string,
    edificacao: string | null,
    uploadedBy: number = 1
): Promise<{
    success: boolean;
    fileId: number;
    filePath: string;
}> {
    try {
        await ensureUploadDir();

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
        const filePath = path.join(UPLOAD_DIR, uniqueFileName);

        // Save file to disk
        await fs.writeFile(filePath, fileBuffer);

        // Save to database
        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        const insertData: any = { // Changed from InsertIfcFile to any as per instruction
            fileName: sanitizedFileName,
            filePath: `/uploads/ifc/${uniqueFileName}`,
            edificacao: edificacao || null,
            uploadedBy,
            fileSize: fileBuffer.length,
        };

        const result = await db.insert(ifcFiles).values(insertData).returning({ id: ifcFiles.id });
        const fileId = result[0].id;

        return {
            success: true,
            fileId,
            filePath: `/uploads/ifc/${uniqueFileName}`,
        };
    } catch (error) {
        console.error('Error handling IFC upload:', error);
        throw error;
    }
}

/**
 * Delete IFC file
 */
export async function deleteIfcFile(fileId: number): Promise<boolean> {
    try {
        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        // Get file info
        const fileResult = await db.select().from(ifcFiles).where(eq(ifcFiles.id, fileId)).limit(1);
        if (fileResult.length === 0) {
            // If file record doesn't exist, considered "deleted"
            return true;
        }

        const file = fileResult[0];

        // Normalize path handling
        // We know uploads are in process.cwd() / uploads / ifc
        const fileName = path.basename(file.filePath);
        const fullPath = path.join(UPLOAD_DIR, fileName);

        console.log(`[deleteIfcFile] Attempting to delete: ${fullPath} (DB ID: ${fileId})`);

        // Delete from disk
        try {
            // Check if file exists first to avoid unnecessary errors
            await fs.access(fullPath);
            await fs.unlink(fullPath);
            console.log(`[deleteIfcFile] Deleted from disk: ${fullPath}`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.warn(`[deleteIfcFile] File not found on disk, proceeding with DB delete: ${fullPath}`);
            } else if (error.code === 'EBUSY' || error.code === 'EPERM') {
                console.warn(`[deleteIfcFile] File locked or permission denied. Disk delete failed but removing from DB. Error: ${error.message}`);
            } else {
                console.warn('[deleteIfcFile] Error deleting file from disk:', error);
            }
        }

        // Delete from database
        await db.delete(ifcFiles).where(eq(ifcFiles.id, fileId));
        console.log(`[deleteIfcFile] Deleted from DB: ID ${fileId}`);

        return true;
    } catch (error) {
        console.error('Error deleting IFC file:', error);
        throw error;
    }
}
