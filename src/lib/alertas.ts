import type { EstadoAlerta } from "./tipos";

export type TomAlerta = "azul" | "verde" | "amarelo" | "vermelho" | "roxo";

export type ApresentacaoAlerta = {
  emoji: string;
  categoria: string;
  tom: TomAlerta;
  acao: string;
};

const APRESENTACOES: Record<string, ApresentacaoAlerta> = {
  tpa: { emoji: "💧", categoria: "TPA", tom: "azul", acao: "Ver aquário" },
  manutencao: { emoji: "🧽", categoria: "Manutenção", tom: "azul", acao: "Ver tarefa" },
  produto: { emoji: "📦", categoria: "Stock", tom: "amarelo", acao: "Ver produtos" },
  ninhada: { emoji: "🐣", categoria: "Ninhada", tom: "roxo", acao: "Ver ninhada" },
  ferias: { emoji: "🧳", categoria: "Férias", tom: "roxo", acao: "Ver checklist" },
  foto: { emoji: "📸", categoria: "Fotografia", tom: "verde", acao: "Abrir aquário" },
  meteo: { emoji: "🌡️", categoria: "Temperatura", tom: "vermelho", acao: "Ver previsão" },
  luz: { emoji: "⚡", categoria: "Corte de luz", tom: "vermelho", acao: "Ver aviso" },
  agua: { emoji: "🚱", categoria: "Corte de água", tom: "vermelho", acao: "Ver aviso" },
  qualidade: { emoji: "🚰", categoria: "Água da rede", tom: "azul", acao: "Ver relatório" },
  loja: { emoji: "🛍️", categoria: "Loja", tom: "verde", acao: "Ver novidade" },
  externo: { emoji: "🌐", categoria: "Novidade", tom: "azul", acao: "Ver detalhe" },
};

const PADRAO: ApresentacaoAlerta = {
  emoji: "🔔",
  categoria: "Aviso",
  tom: "azul",
  acao: "Ver detalhe",
};

export function apresentacaoAlerta(tipo: string) {
  return APRESENTACOES[tipo] ?? PADRAO;
}

export function estadoAtivo(estado: EstadoAlerta | undefined) {
  return !estado || estado === "pendente" || estado === "adiado";
}

/** Amanhã às 09:00 no fuso local do dispositivo. */
export function amanhaDeManha() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  data.setHours(9, 0, 0, 0);
  return data;
}
