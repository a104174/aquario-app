export type AlertaApresentavel = {
  tipo: string;
  titulo: string;
  mensagem: string;
  url: string | null;
};

type Apresentacao = {
  emoji: string;
  categoria: string;
  urgencia: "very-low" | "low" | "normal" | "high";
};

const TIPOS: Record<string, Apresentacao> = {
  tpa: { emoji: "💧", categoria: "TPA", urgencia: "normal" },
  manutencao: { emoji: "🧽", categoria: "Manutenção", urgencia: "low" },
  produto: { emoji: "📦", categoria: "Stock", urgencia: "normal" },
  ninhada: { emoji: "🐣", categoria: "Ninhada", urgencia: "normal" },
  ferias: { emoji: "🧳", categoria: "Férias", urgencia: "normal" },
  foto: { emoji: "📸", categoria: "Fotografia", urgencia: "low" },
  meteo: { emoji: "🌡️", categoria: "Temperatura", urgencia: "high" },
  luz: { emoji: "⚡", categoria: "Corte de luz", urgencia: "high" },
  agua: { emoji: "🚱", categoria: "Corte de água", urgencia: "high" },
  qualidade: { emoji: "🚰", categoria: "Água da rede", urgencia: "low" },
  loja: { emoji: "🛍️", categoria: "Loja", urgencia: "low" },
  externo: { emoji: "🌐", categoria: "Novidade", urgencia: "normal" },
};

const PADRAO: Apresentacao = { emoji: "🔔", categoria: "Aviso", urgencia: "normal" };

function semEmojiInicial(titulo: string) {
  return titulo.replace(/^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\s*/u, "").trim();
}

export function apresentarAlerta(alerta: AlertaApresentavel) {
  const apresentacao = TIPOS[alerta.tipo] ?? PADRAO;
  const urgente = /urgente|corte|risco/i.test(alerta.titulo);
  return {
    title: `${apresentacao.emoji} ${semEmojiInicial(alerta.titulo)}`,
    body: alerta.mensagem,
    url: alerta.url ?? "/alertas",
    categoria: apresentacao.categoria,
    urgency: urgente ? "high" as const : apresentacao.urgencia,
  };
}
