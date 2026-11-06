"use client";

import { useSyncExternalStore } from "react";

type Estado = { ids: string[]; indice: number } | null;
let estado: Estado = null;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

/** Abre o visualizador com uma lista de fotos (por id), a começar em `indice`. */
export function abrirVisualizador(ids: string[], indice: number) {
  estado = { ids, indice };
  emitir();
}
export function fecharVisualizador() {
  estado = null;
  emitir();
}
export function useVisualizador() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
    () => null,
  );
}
