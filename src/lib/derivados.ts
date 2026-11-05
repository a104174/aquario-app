import { diasDesde } from "./formato";
import {
  PARAMETROS,
  type Aquario,
  type Evento,
  type FaunaEvento,
  type Foto,
  type Medicao,
  type Parametro,
  type Tpa,
} from "./tipos";

export function ultimaTpa(tpas: Tpa[] | undefined, aquarioId: string) {
  // listas já vêm ordenadas por data desc
  return tpas?.find((t) => t.aquario_id === aquarioId);
}

export type EstadoTpa = "ok" | "quase" | "atrasada" | "nunca";

export function estadoTpa(tpa: Tpa | undefined, intervalo: number): { estado: EstadoTpa; dias: number | null } {
  if (!tpa) return { estado: "nunca", dias: null };
  const dias = diasDesde(tpa.data);
  if (dias >= intervalo) return { estado: "atrasada", dias };
  if (dias >= intervalo - 1) return { estado: "quase", dias };
  return { estado: "ok", dias };
}

export type UltimoValor = { valor: number; data: string };

/** Valor mais recente de cada parâmetro (cada um pode vir de medições diferentes). */
export function ultimosValores(medicoes: Medicao[] | undefined, aquarioId: string) {
  const r: Partial<Record<Parametro, UltimoValor>> = {};
  for (const m of medicoes ?? []) {
    if (m.aquario_id !== aquarioId) continue;
    for (const p of PARAMETROS) {
      const v = m[p];
      if (r[p] === undefined && v !== null && v !== undefined) r[p] = { valor: Number(v), data: m.data };
    }
  }
  return r;
}

/** Série temporal (ascendente) de um parâmetro. */
export function serie(medicoes: Medicao[] | undefined, aquarioId: string, p: Parametro) {
  const pts: { t: number; v: number; data: string }[] = [];
  for (const m of medicoes ?? []) {
    const v = m[p];
    if (m.aquario_id === aquarioId && v !== null && v !== undefined) {
      pts.push({ t: new Date(m.data).getTime(), v: Number(v), data: m.data });
    }
  }
  return pts.sort((a, b) => a.t - b.t);
}

const SINAL: Record<FaunaEvento["tipo"], 1 | -1> = {
  entrada: 1,
  nascimento: 1,
  morte: -1,
  transferencia: -1,
  saida: -1,
};

/** População atual por espécie (inclui transferências recebidas). */
export function faunaAtual(fauna: FaunaEvento[] | undefined, aquarioId: string) {
  const mapa = new Map<string, { especie: string; quantidade: number }>();
  for (const e of fauna ?? []) {
    let delta = 0;
    if (e.aquario_id === aquarioId) delta = SINAL[e.tipo] * e.quantidade;
    else if (e.tipo === "transferencia" && e.aquario_destino_id === aquarioId) delta = e.quantidade;
    if (!delta) continue;
    const chave = e.especie.trim().toLocaleLowerCase("pt-PT");
    const atual = mapa.get(chave) ?? { especie: e.especie.trim(), quantidade: 0 };
    atual.quantidade += delta;
    mapa.set(chave, atual);
  }
  const lista = [...mapa.values()].filter((x) => x.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade);
  return { lista, total: lista.reduce((s, x) => s + x.quantidade, 0) };
}

/** Espécies já registadas (para sugestões no formulário). */
export function especiesConhecidas(fauna: FaunaEvento[] | undefined) {
  const s = new Map<string, string>();
  for (const e of fauna ?? []) s.set(e.especie.trim().toLocaleLowerCase("pt-PT"), e.especie.trim());
  return [...s.values()].sort((a, b) => a.localeCompare(b, "pt-PT"));
}

export function juntarEventos(
  d: { tpas?: Tpa[]; medicoes?: Medicao[]; fauna?: FaunaEvento[]; fotos?: Foto[] },
  filtro?: (aquarioId: string, e: { aquario_destino_id?: string | null }) => boolean,
): Evento[] {
  const ok = (a: string, e: object = {}) => !filtro || filtro(a, e);
  const ev: Evento[] = [
    ...(d.tpas ?? []).filter((x) => ok(x.aquario_id)).map((item) => ({ tipo: "tpa" as const, id: item.id, aquario_id: item.aquario_id, data: item.data, item })),
    ...(d.medicoes ?? []).filter((x) => ok(x.aquario_id)).map((item) => ({ tipo: "medicao" as const, id: item.id, aquario_id: item.aquario_id, data: item.data, item })),
    ...(d.fauna ?? []).filter((x) => ok(x.aquario_id, x)).map((item) => ({ tipo: "fauna" as const, id: item.id, aquario_id: item.aquario_id, data: item.data, item })),
    ...(d.fotos ?? []).filter((x) => ok(x.aquario_id)).map((item) => ({ tipo: "foto" as const, id: item.id, aquario_id: item.aquario_id, data: item.data, item })),
  ];
  return ev.sort((a, b) => b.data.localeCompare(a.data));
}

/** Agrupa eventos por dia (chave YYYY-MM-DD local). */
export function agruparPorDia(eventos: Evento[]) {
  const grupos: { dia: string; data: string; eventos: Evento[] }[] = [];
  for (const e of eventos) {
    const d = new Date(e.data);
    const dia = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const g = grupos.at(-1);
    if (g && g.dia === dia) g.eventos.push(e);
    else grupos.push({ dia, data: e.data, eventos: [e] });
  }
  return grupos;
}

export function volumeReferencia(a: Aquario | undefined) {
  return a?.volume_util_l ?? a?.volume_bruto_l ?? null;
}

export function novoId() {
  return crypto.randomUUID();
}
