import { dataCurta, diasDesde } from "./formato";
import type { Produto, TipoProduto, Tpa } from "./tipos";

export const TIPOS_PRODUTO: { valor: TipoProduto; texto: string }[] = [
  { valor: "condicionador", texto: "Condicionador" },
  { valor: "comida", texto: "Comida" },
  { valor: "bacterias", texto: "Bactérias" },
  { valor: "outro", texto: "Outro" },
];

export type EstadoStock = {
  /** 0–1 (o que resta) ou null se não há dados para estimar */
  fracao: number | null;
  nivel: "ok" | "baixo" | "vazio" | "desconhecido";
  /** Texto curto: "≈ 7 TPAs · 32 ml" ou "acaba ~12 dez" */
  resumo: string;
  restante?: number;
  tpasRestantes?: number;
  fim?: Date;
};


/**
 * Condicionador: restante = volume − doses das TPAs desde a abertura.
 * "Baixo" quando restam ~3 TPAs (média das últimas 3 doses).
 * Comida/bactérias/outro: fim estimado = abertura + duração indicada.
 */
export function estadoStock(p: Produto, tpas: Tpa[] | undefined): EstadoStock {
  if (p.tipo === "condicionador") {
    if (!p.volume_inicial) return { fracao: null, nivel: "desconhecido", resumo: "Sem volume da embalagem" };
    const tpasProduto = (tpas ?? []).filter((t) => t.condicionador_id === p.id && t.dose_ml != null);
    const desde = p.stock_atualizado_em
      ? new Date(p.stock_atualizado_em).getTime()
      : p.data_abertura
        ? new Date(p.data_abertura + "T00:00:00").getTime()
        : -Infinity;
    const usadas = tpasProduto.filter((t) => new Date(t.data).getTime() >= desde);
    const consumo = usadas.reduce((s, t) => s + Number(t.dose_ml), 0);
    const quantidadeDePartida = p.volume_inicial * (p.stock_manual_fracao ?? 1);
    const restante = Math.max(0, quantidadeDePartida - consumo);
    const ultimas = tpasProduto.slice(0, 3).map((t) => Number(t.dose_ml)).filter((d) => d > 0);
    const media = ultimas.length ? ultimas.reduce((a, b) => a + b, 0) / ultimas.length : null;
    const tpasRestantes = media ? Math.floor(restante / media) : undefined;
    const nivel = restante <= 0 ? "vazio" : media && restante <= 3 * media ? "baixo" : "ok";
    const resumo =
      tpasRestantes !== undefined
        ? `≈ ${tpasRestantes} ${tpasRestantes === 1 ? "TPA" : "TPAs"} · ${Math.round(restante)} ${p.unidade}`
        : `${Math.round(restante)} ${p.unidade} restantes`;
    return { fracao: restante / p.volume_inicial, nivel, resumo, restante, tpasRestantes };
  }

  if (p.stock_manual_fracao != null) {
    const fracao = Math.max(0, Math.min(1, Number(p.stock_manual_fracao)));
    const restante = p.volume_inicial ? p.volume_inicial * fracao : undefined;
    const nivel = fracao <= 0 ? "vazio" : fracao <= 0.25 ? "baixo" : "ok";
    const estado = fracao >= 0.85 ? "Cheio" : fracao >= 0.35 ? "A meio" : fracao > 0 ? "Pouco" : "Vazio";
    const resumo = restante === undefined ? estado : `${estado} · ≈ ${Math.round(restante)} ${p.unidade}`;
    return { fracao, nivel, resumo, restante };
  }

  if (!p.data_abertura || !p.duracao_dias) return { fracao: null, nivel: "desconhecido", resumo: "Indica a abertura e a duração" };
  const usados = diasDesde(p.data_abertura + "T12:00:00");
  const fim = new Date(p.data_abertura + "T12:00:00");
  fim.setDate(fim.getDate() + p.duracao_dias);
  const faltam = p.duracao_dias - usados;
  const nivel = faltam <= 0 ? "vazio" : faltam <= 5 ? "baixo" : "ok";
  return {
    fracao: Math.max(0, Math.min(1, faltam / p.duracao_dias)),
    nivel,
    resumo: faltam <= 0 ? "Deve ter acabado" : `Acaba ~${dataCurta(fim.toISOString())} (${faltam} d)`,
    fim,
  };
}

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
