"use client";

import { useSyncExternalStore } from "react";

export type Toast = { id: number; texto: string; tipo: "info" | "erro" | "ok" };

let toasts: Toast[] = [];
let seq = 0;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

export function toast(texto: string, tipo: Toast["tipo"] = "info", ms = 3200) {
  const id = ++seq;
  toasts = [...toasts.filter((t) => t.texto !== texto), { id, texto, tipo }];
  emitir();
  setTimeout(() => fecharToast(id), ms);
}

export function fecharToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitir();
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
