export const TABELAS = {
  aquarios: "aquarios",
  produtos: "produtos",
  ninhadas: "ninhadas",
  ferias: "ferias",
  desejos: "desejos",
  alertas: "alertas",
  fontes: "fontes_externas",
  novidades: "novidades_externas",
  tpas: "tpas",
  medicoes: "medicoes",
  fauna: "fauna_eventos",
  fotos: "fotos",
} as const;

export type Colecao = keyof typeof TABELAS;

export const qk = {
  colecao: (c: Colecao) => [c] as const,
  definicoes: ["definicoes"] as const,
  fotoUrl: (path: string) => ["foto-url", path] as const,
};
