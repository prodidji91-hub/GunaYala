import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (val: string, prefix: string): string => {
  if (!val) return '';
  let cleaned = val.trim();
  if (cleaned.startsWith(`${prefix}=`)) {
    cleaned = cleaned.slice(prefix.length + 1).trim();
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabaseUrl = cleanEnvVar(rawUrl, 'VITE_SUPABASE_URL');
const supabaseAnonKey = cleanEnvVar(rawKey, 'VITE_SUPABASE_PUBLISHABLE_KEY');

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY' &&
  isValidUrl(supabaseUrl)
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
