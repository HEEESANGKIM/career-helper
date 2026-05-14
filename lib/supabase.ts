import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const getSessionWithRetry = async (attempts = 20, delayMs = 120) => {
  if (!supabase || !isSupabaseConfigured) return null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, delayMs);
    });
  }

  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};
