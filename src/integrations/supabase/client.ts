import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// VIRUM: Conexão direta e fixa ao projeto Supabase oficial mhvmjgyibehthmglnxge.
// Não utiliza import.meta.env para evitar que variáveis de ambiente do sistema
// (especialmente as do Lovable Cloud temporário) sejam injetadas no bundle.
const OFFICIAL_URL = "https://mhvmjgyibehthmglnxge.supabase.co";
const OFFICIAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odm1qZ3lpYmVodGhtZ2xueGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODA3MzMsImV4cCI6MjA5OTc1NjczM30.q7HPwRtPTz6_iljhaI-dmUBWygZSOvHgol6WNVnjSMs";

if (import.meta.env.DEV) {
  console.log("[VIRUM] Supabase Client Initialized:", { url: OFFICIAL_URL, isOfficial: true });
}

export const supabase = createClient<Database>(OFFICIAL_URL, OFFICIAL_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
