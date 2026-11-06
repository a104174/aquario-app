"use client";

/**
 * Haptics: navigator.vibrate existe no Android (Chrome); no iOS não existe
 * (o Safari não expõe vibração à web) — aí é simplesmente ignorado.
 */
const PADROES = {
  leve: 8, // seleção (stepper, segmentado, limiar de um gesto)
  medio: 18, // toque longo, apagar
  sucesso: [10, 40, 14], // guardado
  aviso: [30, 60, 30],
} as const;

export function vibrar(tipo: keyof typeof PADROES = "leve") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(PADROES[tipo] as number | number[]);
  } catch {
    // sem suporte / bloqueado pelo browser: ignorar
  }
}
