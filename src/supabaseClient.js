import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[ManjoCity] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. Vérifiez les variables d\'environnement.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'manjocity-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
