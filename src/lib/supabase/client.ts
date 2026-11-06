"use client";

import type { ClienteSupabase } from "./minimo";

// Chave fixa no localStorage: permite ler a sessão de forma síncrona no
// arranque (ver lib/auth) e evitar qualquer ecrã de "a carregar".
export const AUTH_STORAGE_KEY = "aquario-auth";

let cliente: Promise<ClienteSupabase> | null = null;

/**
 * Cliente Supabase carregado a pedido (import dinâmico) e mínimo (sem o
 * Realtime, ver ./minimo.ts): sai do bundle inicial, por isso o primeiro ecrã (que vem da
 * cache em IndexedDB) hidrata sem esperar por ele.
 */
export function supabase(): Promise<ClienteSupabase> {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Promise.reject(new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example)."));
  }
  cliente = import("./minimo").then(({ criarClienteMinimo }) =>
    criarClienteMinimo(url, key, { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true }),
  );
  return cliente;
}
