import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("[Storage] Supabase environment variables are missing! Storage will fallback to local (dev only).");
}

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false
        }
    })
    : null;

/**
 * Uploads a file to Supabase Storage or Local Filesystem as fallback
 */
export async function uploadToStorage(
    fileBuffer: Buffer,
    fileName: string,
    bucket: string = 'ifc-files',
    folder: string = 'images'
): Promise<string> {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const storagePath = `${folder}/${uniqueFileName}`;

    // 1. Try Supabase Storage (Preferred for Vercel)
    if (supabase) {
        try {
            console.log(`[Storage] Uploading to Supabase: ${bucket}/${storagePath}`);
            const { error } = await supabase.storage
                .from(bucket)
                .upload(storagePath, fileBuffer, {
                    contentType: getContentType(fileName),
                    upsert: false
                });

            if (error) {
                console.error('[Storage] Supabase Error:', error);
                throw new Error(`Supabase Storage Error: ${error.message}`);
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(storagePath);
                
                return publicUrl;
            }
        } catch (e: any) {
            console.error('[Storage] Supabase Upload Exception:', e);
            throw e;
        }
    }

    // 2. Fallback to Local Filesystem (Development only)
    if (process.env.VERCEL) {
        console.warn("[Storage] Supabase failed or not configured. Returning Base64 fallback.");
        const base64 = fileBuffer.toString('base64');
        const contentType = getContentType(fileName);
        return `data:${contentType};base64,${base64}`;
    }
    
    console.log(`[Storage] Falling back to local storage for ${fileName}`);
    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localPath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(localPath, fileBuffer);

    return `/uploads/${folder}/${uniqueFileName}`;
}

function getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'svg': return 'image/svg+xml';
        case 'pdf': return 'application/pdf';
        default: return 'application/octet-stream';
    }
}
