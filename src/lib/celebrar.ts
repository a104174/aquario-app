"use client";

import { useSyncExternalStore } from "react";

export type Celebracao = { id: number; titulo: string; detalhe?: string };

let atual: Celebracao | null = null;
let seq = 0;
let timer = 0;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

/** Momento de celebração curto (≈ 1,8 s), não bloqueante. */
export function celebrar(titulo: string, detalhe?: string) {
  atual = { id: ++seq, titulo, detalhe };
  emitir();
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    atual = null;
    emitir();
  }, 1800);
}

export function useCelebracao() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
    () => null,
  );
}
