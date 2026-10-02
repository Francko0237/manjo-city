import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[ManjoCity] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. Vérifie les Environment Variables sur Vercel puis redéploie.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
