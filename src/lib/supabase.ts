import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const configured = Boolean(url && key);

if (!configured && import.meta.env.DEV) {
  console.warn(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local. Os dados usarão apenas localStorage até então.'
  );
}

export const supabase: SupabaseClient | null = configured ? createClient(url, key) : null;

export const isSupabaseConfigured = () => supabase !== null;
