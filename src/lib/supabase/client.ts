"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Chave fixa no localStorage: permite ler a sessão de forma síncrona no
// arranque (ver lib/auth) e evitar qualquer ecrã de "a carregar".
export const AUTH_STORAGE_KEY = "aquario-auth";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).");
  }
  client = createClient(url, key, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  });
  return client;
}
