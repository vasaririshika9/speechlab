import { createClient } from '@supabase/supabase-js';

// Safe environment variable resolution supporting Vite (import.meta.env) and Node/test environments
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined'
    ? process.env
    : ({} as Record<string, string | undefined>);

const rawUrl = (env.VITE_SUPABASE_URL || '').trim();
// Automatically sanitize URL if user accidentally included /rest/v1 or trailing slashes
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();



export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

