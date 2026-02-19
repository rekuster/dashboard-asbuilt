
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mwjgsaurifctbatsindf.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_6-WQ0HVPiANSZ2go-Qeyjg_t3xH78VV";

if (!supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_ANON_KEY. Storage features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
