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
    const desde = p.data_abertura ? new Date(p.data_abertura + "T00:00:00").getTime() : -Infinity;
    const usadas = (tpas ?? []).filter((t) => t.condicionador_id === p.id && t.dose_ml != null && new Date(t.data).getTime() >= desde);
    const consumo = usadas.reduce((s, t) => s + Number(t.dose_ml), 0);
    const restante = Math.max(0, p.volume_inicial - consumo);
    const ultimas = usadas.slice(0, 3).map((t) => Number(t.dose_ml)).filter((d) => d > 0);
    const media = ultimas.length ? ultimas.reduce((a, b) => a + b, 0) / ultimas.length : null;
    const tpasRestantes = media ? Math.floor(restante / media) : undefined;
    const nivel = restante <= 0 ? "vazio" : media && restante <= 3 * media ? "baixo" : "ok";
    const resumo =
      tpasRestantes !== undefined
        ? `≈ ${tpasRestantes} ${tpasRestantes === 1 ? "TPA" : "TPAs"} · ${Math.round(restante)} ${p.unidade}`
        : `${Math.round(restante)} ${p.unidade} restantes`;
    return { fracao: restante / p.volume_inicial, nivel, resumo, restante, tpasRestantes };
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
