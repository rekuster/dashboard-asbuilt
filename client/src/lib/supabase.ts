import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || "https://mwjgsaurifctbatsindf.supabase.co";
const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13amdzYXVyaWZjdGJhdHNpbmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjMwMzUsImV4cCI6MjA4Njk5OTAzNX0.GSAzXMeKAoCW5CfcByZeo6torE7JIw_AKrJq2GQa5J0";

if (!supabaseAnonKey) {
    console.warn("Missing VITE_SUPABASE_ANON_KEY. Storage and Auth will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
