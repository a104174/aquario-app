"use client";

import { useSyncExternalStore } from "react";

export type AcaoToast = { texto: string; onClick: () => void };
export type Toast = { id: number; texto: string; tipo: "info" | "erro" | "ok"; saindo?: boolean; acao?: AcaoToast };

let toasts: Toast[] = [];
let seq = 0;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

export function toast(texto: string, tipo: Toast["tipo"] = "info", ms = 3200, acao?: AcaoToast) {
  const id = ++seq;
  toasts = [...toasts.filter((t) => t.texto !== texto), { id, texto, tipo, acao }].slice(-3);
  emitir();
  setTimeout(() => fecharToast(id), ms);
}

export function fecharToast(id: number) {
  if (!toasts.some((t) => t.id === id && !t.saindo)) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, saindo: true } : t));
  emitir();
  // remove depois da animação de saída (--dur-exit = 200ms)
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitir();
  }, 200);
}

export function useToasts() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => toasts,
    () => toasts,
  );
}
