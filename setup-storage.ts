
import "dotenv/config";
import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function setupStorage() {
    const db = await getDb();
    if (!db) {
        console.error("❌ Could not connect to DB");
        return;
    }

    console.log("🛠️ Checking/Creating Supabase storage bucket 'project-assets'...");
    try {
        // 1. Insert bucket if it doesn't exist
        // Supabase stores buckets in storage.buckets
        await db.execute(sql.raw(`
            INSERT INTO storage.buckets (id, name, public)
            VALUES ('project-assets', 'project-assets', true)
            ON CONFLICT (id) DO NOTHING;
        `));

        // 2. Set up RLS policies so anyone can upload/view for now (since it's a private tool)
        // Note: In a production app, you'd want more restrictive policies.
        await db.execute(sql.raw(`
            DO $$
            BEGIN
                -- Allow public access to read
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'objects' 
                    AND policyname = 'Public Access'
                ) THEN
                    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'project-assets');
                END IF;

                -- Allow anyone to upload (for this specific dashboard tool)
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'objects' 
                    AND policyname = 'Public Upload'
                ) THEN
                    CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-assets');
                END IF;

                -- Allow anyone to update/delete
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'objects' 
                    AND policyname = 'Public Update'
                ) THEN
                    CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'project-assets');
                END IF;
            END
            $$;
        `));

        console.log("✅ Storage setup complete!");
    } catch (e) {
        console.error("❌ Error setting up storage:", e);
        console.log("Tip: If the error is 'schema storage does not exist', make sure Storage is enabled in your Supabase project.");
    }
}

setupStorage().then(() => process.exit(0));
