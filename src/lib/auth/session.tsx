"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase/client";

type Estado = { session: Session | null; pronto: boolean };

const SessionContext = createContext<Estado>({ session: null, pronto: false });

/**
 * Lê a sessão guardada de forma síncrona (localStorage) para o primeiro
 * render já saber se há utilizador — arranque instantâneo, sem spinner.
 * Depois o supabase-js valida/renova o token em segundo plano.
 */
function sessaoGuardada(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.user ? s : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ session: null, pronto: false });

  useEffect(() => {
    // Hidratação: o HTML estático não sabe nada da sessão; no primeiro
    // efeito lemos o localStorage (síncrono, sem rede).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ session: sessaoGuardada(), pronto: true });
    let cancelar: (() => void) | null = null;
    let vivo = true;
    void supabase().then((sb) => {
      if (!vivo) return;
      const { data } = sb.auth.onAuthStateChange((_evt, session) => setEstado({ session, pronto: true }));
      cancelar = () => data.subscription.unsubscribe();
    });
    return () => {
      vivo = false;
      cancelar?.();
    };
  }, []);

  return <SessionContext.Provider value={estado}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export function useUserId(): string | null {
  return useContext(SessionContext).session?.user.id ?? null;
}
