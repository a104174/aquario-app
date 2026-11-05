"use client";

import type { QueryClient } from "@tanstack/react-query";
import { limparFotosPendentes } from "@/lib/query/fotos-locais";
import { persister } from "@/lib/query/persistencia";
import { supabase } from "@/lib/supabase/client";

/** Termina sessão e apaga todos os dados locais (cache, fotos pendentes). */
export async function sair(qc: QueryClient) {
  try {
    await supabase().auth.signOut({ scope: "local" });
  } catch {
    // offline: a sessão local é apagada na mesma
  }
  qc.getMutationCache().clear();
  qc.clear();
  await Promise.allSettled([persister.removeClient(), limparFotosPendentes()]);
  if (typeof caches !== "undefined") await caches.delete("fotos").catch(() => {});
}
