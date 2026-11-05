"use client";

import { useState } from "react";
import type { Aquario } from "@/lib/tipos";

const KEY = "aquario-ultimo-usado";

export function lembrarAquario(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

/** Aquário pré-escolhido: o do contexto, senão o último usado, senão o primeiro. */
export function useAquarioEscolhido(aquarios: Aquario[] | undefined, preferido?: string | null) {
  const [id, setId] = useState<string | null>(() => {
    if (preferido) return preferido;
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const valido = aquarios?.some((a) => a.id === id) ? id : (aquarios?.[0]?.id ?? null);
  return [valido, setId] as const;
}

export type PropsForm<T> = {
  formId: string;
  inicial?: T;
  aquarioId?: string | null;
  onFeito: (msg: string) => void;
};
