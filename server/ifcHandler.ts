import fs from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getDb, ifcFiles } from './db';
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client for Server-Side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Note: For server-side storage operations (upload/delete), we might need the Service Role Key if RLS is strict.
// However, since we are using a public bucket and anon key usually has insert permissions if configured, we'll try with anon first.
// If it fails, we'll need the service role key env var.

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

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
        if (!supabase) {
            throw new Error('Supabase client not initialized. Check environment variables.');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
        const filePath = `uploads/${uniqueFileName}`; // Path inside the bucket

        console.log(`[IFC Upload] Uploading to Supabase Storage: ${filePath}`);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('ifc-files')
            .upload(filePath, fileBuffer, {
                contentType: 'application/x-step', // Standard MIME type for IFC
                upsert: false
            });

        if (error) {
            console.error('[IFC Upload] Storage Error:', error);
            throw new Error(`Storage Upload Failed: ${error.message}`);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('ifc-files')
            .getPublicUrl(filePath);

        console.log(`[IFC Upload] Success! Public URL: ${publicUrl}`);

        // Save to database
        const db = await getDb();
        if (!db) {
            throw new Error('Database not available');
        }

        const insertData: any = {
            fileName: sanitizedFileName,
            filePath: publicUrl, // Save the full URL
            edificacao: edificacao || null,
            uploadedBy,
            fileSize: fileBuffer.length,
        };

        const result = await db.insert(ifcFiles).values(insertData).returning({ id: ifcFiles.id });
        const fileId = result[0].id;

        return {
            success: true,
            fileId,
            filePath: publicUrl,
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
            return true;
        }

        const file = fileResult[0];

        // Delete from Storage
        if (supabase && file.filePath && file.filePath.includes('supabase.co')) {
            try {
                // Extract path from URL. 
                // URL: https://[project].supabase.co/storage/v1/object/public/ifc-files/uploads/[filename]
                // We need: uploads/[filename]

                const urlParts = file.filePath.split('/ifc-files/');
                if (urlParts.length > 1) {
                    const storagePath = urlParts[1]; // content after bucket name
                    console.log(`[deleteIfcFile] Deleting from Storage: ${storagePath}`);
                    const { error } = await supabase.storage
                        .from('ifc-files')
                        .remove([storagePath]);

                    if (error) {
                        console.warn('[deleteIfcFile] Error deleting from storage:', error);
                    }
                }
            } catch (e) {
                console.warn('[deleteIfcFile] Failed to parse URL for storage deletion:', e);
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
