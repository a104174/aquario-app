"use client";

import { useSyncExternalStore } from "react";

// Estado global de UI fora do React (sheets abertas a partir de qualquer ecrã).

export type TipoRegisto = "tpa" | "medicao" | "fauna" | "foto";

export type EstadoUI = {
  registar: { aberto: boolean; tipo: TipoRegisto | null; aquarioId: string | null; editarId: string | null };
};

let estado: EstadoUI = { registar: { aberto: false, tipo: null, aquarioId: null, editarId: null } };
const ouvintes = new Set<() => void>();

function definir(f: (e: EstadoUI) => EstadoUI) {
  estado = f(estado);
  ouvintes.forEach((o) => o());
}

export function abrirRegistar(opts: { tipo?: TipoRegisto; aquarioId?: string; editarId?: string } = {}) {
  definir((e) => ({
    ...e,
    registar: { aberto: true, tipo: opts.tipo ?? null, aquarioId: opts.aquarioId ?? null, editarId: opts.editarId ?? null },
  }));
}

export function fecharRegistar() {
  definir((e) => ({ ...e, registar: { ...e.registar, aberto: false } }));
}

export function escolherTipoRegisto(tipo: TipoRegisto | null) {
  definir((e) => ({ ...e, registar: { ...e.registar, tipo } }));
}

export function useUI<T>(sel: (e: EstadoUI) => T): T {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => sel(estado),
    () => sel(estado),
  );
}
