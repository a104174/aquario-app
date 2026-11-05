import type { Parametro } from "./tipos";

export type Faixa = "ok" | "atencao" | "mau";

export interface InfoParametro {
  chave: Parametro;
  nome: string;
  curto: string;
  unidade: string;
  decimais: number;
  /** Valores de referência genéricos para água doce tropical. */
  faixa: (v: number) => Faixa;
  /** Intervalo "ok" desenhado como banda neutra no gráfico. */
  referencia: [number, number];
}

const entre = (v: number, a: number, b: number) => v >= a && v <= b;

export const INFO_PARAMETROS: Record<Parametro, InfoParametro> = {
  nh3_nh4: {
    chave: "nh3_nh4",
    referencia: [0, 0.1],
    nome: "Amónia/amónio",
    curto: "NH₃/NH₄",
    unidade: "mg/L",
    decimais: 2,
    faixa: (v) => (v <= 0.1 ? "ok" : v <= 0.5 ? "atencao" : "mau"),
  },
  no2: {
    chave: "no2",
    referencia: [0, 0.1],
    nome: "Nitrito",
    curto: "NO₂",
    unidade: "mg/L",
    decimais: 2,
    faixa: (v) => (v <= 0.1 ? "ok" : v <= 0.5 ? "atencao" : "mau"),
  },
  no3: {
    chave: "no3",
    referencia: [0, 25],
    nome: "Nitrato",
    curto: "NO₃",
    unidade: "mg/L",
    decimais: 1,
    faixa: (v) => (v <= 25 ? "ok" : v <= 50 ? "atencao" : "mau"),
  },
  ph: {
    chave: "ph",
    referencia: [6.5, 7.8],
    nome: "pH",
    curto: "pH",
    unidade: "",
    decimais: 1,
    faixa: (v) => (entre(v, 6.5, 7.8) ? "ok" : entre(v, 6, 8.2) ? "atencao" : "mau"),
  },
  gh: {
    chave: "gh",
    referencia: [4, 16],
    nome: "Dureza geral",
    curto: "GH",
    unidade: "°dGH",
    decimais: 1,
    faixa: (v) => (entre(v, 4, 16) ? "ok" : entre(v, 2, 20) ? "atencao" : "mau"),
  },
  kh: {
    chave: "kh",
    referencia: [3, 10],
    nome: "Dureza carbonatada",
    curto: "KH",
    unidade: "°dKH",
    decimais: 1,
    faixa: (v) => (entre(v, 3, 10) ? "ok" : entre(v, 1, 14) ? "atencao" : "mau"),
  },
  temperatura_c: {
    chave: "temperatura_c",
    referencia: [22, 28],
    nome: "Temperatura",
    curto: "Temp.",
    unidade: "°C",
    decimais: 1,
    faixa: (v) => (entre(v, 22, 28) ? "ok" : entre(v, 20, 30) ? "atencao" : "mau"),
  },
};
