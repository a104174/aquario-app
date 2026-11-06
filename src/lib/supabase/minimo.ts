// Cliente Supabase mínimo: só os módulos que a app usa (PostgREST, Auth,
// Storage, Functions) — sem o Realtime. ~70 KB a menos que o supabase-js,
// com a mesma interface (.from, .rpc, .auth, .storage, .functions).
import { AuthClient, type SupportedStorage } from "@supabase/auth-js";
import { FunctionsClient } from "@supabase/functions-js";
import { PostgrestClient } from "@supabase/postgrest-js";
import { StorageClient } from "@supabase/storage-js";

export type OpcoesCliente = { storageKey: string; storage?: SupportedStorage; persistSession?: boolean; autoRefreshToken?: boolean };

export function criarClienteMinimo(url: string, chave: string, o: OpcoesCliente) {
  // Chaves novas (sb_publishable_…) não são JWT: não vão como Bearer
  const chaveNova = chave.startsWith("sb_");
  const base = url.replace(/\/$/, "");
  const auth = new AuthClient({
    url: `${base}/auth/v1`,
    headers: chaveNova ? { apikey: chave } : { apikey: chave, Authorization: `Bearer ${chave}` },
    storageKey: o.storageKey,
    storage: o.storage,
    persistSession: o.persistSession ?? true,
    autoRefreshToken: o.autoRefreshToken ?? true,
    detectSessionInUrl: false,
    flowType: "implicit",
  });
  // Igual ao fetchWithAuth do supabase-js: token da sessão (ou a chave) em cada pedido
  const fetchAuth: typeof fetch = async (input, init = {}) => {
    const { data } = await auth.getSession();
    const token = data.session?.access_token;
    const h = new Headers(init.headers);
    if (!h.has("apikey")) h.set("apikey", chave);
    if (!h.has("Authorization")) {
      if (token) h.set("Authorization", `Bearer ${token}`);
      else if (!chaveNova) h.set("Authorization", `Bearer ${chave}`);
    }
    return fetch(input, { ...init, headers: h });
  };
  const rest = new PostgrestClient(`${base}/rest/v1`, { headers: { apikey: chave }, fetch: fetchAuth });
  return {
    auth,
    from: (tabela: string) => rest.from(tabela),
    rpc: (fn: string, args?: Record<string, unknown>) => rest.rpc(fn, args),
    storage: new StorageClient(`${base}/storage/v1`, { apikey: chave }, fetchAuth),
    functions: new FunctionsClient(`${base}/functions/v1`, { headers: { apikey: chave }, customFetch: fetchAuth }),
  };
}

export type ClienteSupabase = ReturnType<typeof criarClienteMinimo>;
