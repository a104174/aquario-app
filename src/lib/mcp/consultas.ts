import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PARAMETROS, type Aquario, type FaunaEvento } from "@/lib/tipos";

export class ErroConsulta extends Error {}

export function clienteDoUtilizador(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const origem = new URL(url).origin;
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const destino = new URL(input instanceof Request ? input.url : input);
        const metodo = init?.method ?? (input instanceof Request ? input.method : "GET");
        // A assinatura em lote é um POST de leitura do Storage, usado pelo contrato antigo.
        const assinatura = metodo === "POST" && destino.pathname === "/storage/v1/object/sign/fotos";
        if (destino.origin !== origem || !(metodo === "GET" || metodo === "HEAD" || assinatura)) {
          throw new Error("Operação bloqueada no cliente MCP");
        }
        const prazo = AbortSignal.timeout(8_000);
        const sinal = init?.signal ? AbortSignal.any([init.signal, prazo]) : prazo;
        return fetch(input, { ...init, signal: sinal, redirect: "error", cache: "no-store" });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function q<T>(consulta: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await consulta;
  if (error) throw new Error("Falha na consulta ao Supabase");
  return data as T;
}

export const COL_AQUARIO = "id,nome,volume_bruto_l,volume_util_l,notas,criado_em,foto_capa_id";
export const COL_TPA = "id,aquario_id,data,litros,condicionador_id,dose_ml,notas";
export const COL_MEDICAO = ["id", "aquario_id", "data", "metodo", "notas", ...PARAMETROS].join(",");
export const COL_FAUNA = "id,aquario_id,aquario_destino_id,data,tipo,especie,quantidade,notas,variedade,nome_personalizado,grupo_id,grupo_proprio,foto_destaque_id";
export const COL_NINHADA = "id,aquario_id,mae,data_parto,estado,notas,criado_em";
export const COL_FOTO = "id,aquario_id,data,etiqueta,legenda,evento_tipo,evento_id";
export const COL_PRODUTO = "id,nome,tipo,dose_por_litro,volume_inicial,unidade,data_abertura,duracao_dias,ativo,stock_manual_fracao,stock_atualizado_em,criado_em";

export const timestamp = z.iso.datetime({ offset: true });
const uuid = z.uuid();
export const cursorArg = z.object({ data: timestamp, id: uuid });
export const janelaArgs = {
  de: timestamp.optional().describe("Início inclusivo, com fuso explícito"),
  ate: timestamp.optional().describe("Fim exclusivo, com fuso explícito. Reutilizar o período devolvido ao paginar"),
};
export const limiteArg = (padrao: number, maximo = 100) => z.number().int().min(1).max(maximo).default(padrao);
export type Cursor = z.infer<typeof cursorArg>;
export type Periodo = { de: string; ate: string };
export type Janela = Partial<Periodo> & { dias?: number };

export function compararInstantes(a: string, b: string) {
  // O Postgres preserva microssegundos. Date.parse só compara até aos milissegundos.
  const fracao = (data: string) => (data.match(/\.(\d+)/)?.[1] ?? "").slice(3).padEnd(6, "0");
  return Date.parse(a) - Date.parse(b) || compararTexto(fracao(a), fracao(b));
}

export function compararTexto(a: string, b: string) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function periodo({ de, ate = new Date().toISOString(), dias }: Janela, padrao: number): Periodo {
  const inicio = de ?? new Date(Date.parse(ate) - (dias ?? padrao) * 86_400_000).toISOString();
  if (compararInstantes(inicio, ate) >= 0) throw new ErroConsulta("O início do período deve anteceder o fim.");
  if (Date.parse(ate) - Date.parse(inicio) > 366 * 86_400_000) {
    throw new ErroConsulta("O período pode ter até 366 dias.");
  }
  return { de: inicio, ate };
}

function selecao(sb: SupabaseClient, tabela: string, colunas: string) {
  return sb.from(tabela).select(colunas);
}

export type Consulta = ReturnType<typeof selecao>;

export function pagina<T>(
  sb: SupabaseClient, tabela: string, colunas: string,
  op: {
    periodo: Periodo; limite: number; cursor?: Cursor;
    colunaData?: string; incluirEmpate?: boolean; ordem?: "asc" | "desc";
    filtrar?: (consulta: Consulta) => Consulta;
  },
) {
  const data = op.colunaData ?? "data";
  const asc = op.ordem === "asc";
  let consulta = selecao(sb, tabela, colunas).gte(data, op.periodo.de).lt(data, op.periodo.ate);
  if (op.filtrar) consulta = op.filtrar(consulta);
  if (op.cursor) {
    const { data: instante, id } = op.cursor;
    const operador = asc ? "gt" : "lt";
    const operadorId = op.incluirEmpate ? `${operador}e` : operador;
    consulta = consulta.or(`${data}.${operador}.${instante},and(${data}.eq.${instante},id.${operadorId}.${id})`);
  }
  return q<T[]>(consulta.order(data, { ascending: asc }).order("id", { ascending: asc }).limit(op.limite + 1));
}

export function paginar<T extends Cursor>(registos: T[], limite: number, intervalo: Periodo) {
  const itens = registos.slice(0, limite);
  const ultimo = itens.at(-1);
  return {
    periodo: intervalo, itens,
    proximo_cursor: registos.length > limite && ultimo ? { data: ultimo.data, id: ultimo.id } : null,
  };
}

export function textoDado(texto: string | null | undefined, limite = 600) {
  return texto && texto.length > limite ? texto.slice(0, limite) + "…" : texto ?? null;
}

export async function aquarios(sb: SupabaseClient, filtro?: string) {
  const nome = filtro?.trim();
  let consulta = sb.from("aquarios").select(COL_AQUARIO);
  if (nome) {
    consulta = uuid.safeParse(nome).success
      ? consulta.eq("id", nome)
      : consulta.ilike("nome", `%${nome.replace(/[\\%_]/g, "\\$&")}%`);
  }
  const lista = await q<Aquario[]>(consulta.order("criado_em").order("id").limit(101));
  if (lista.length > 100) throw new ErroConsulta("Demasiados aquários. Indica um nome ou ID.");
  if (nome && !lista.length) throw new ErroConsulta("Aquário não encontrado ou sem acesso.");
  return lista;
}

export function filtroFauna(ids: string[]) {
  const filtro = `in.(${ids.join(",")})`;
  return `aquario_id.${filtro},aquario_destino_id.${filtro}`;
}

export async function historicoFauna(sb: SupabaseClient, ids?: string[], ate?: string) {
  const itens: FaunaEvento[] = [];
  const maximo = 3_000;
  while (itens.length <= maximo) {
    const limite = Math.min(500, maximo + 1 - itens.length);
    let consulta = sb.from("fauna_eventos").select(COL_FAUNA).order("id").limit(limite);
    if (ids) consulta = consulta.or(filtroFauna(ids));
    if (ate) consulta = consulta.lte("data", ate);
    const ultimo = itens.at(-1);
    if (ultimo) consulta = consulta.gt("id", ultimo.id);
    const lote = await q<FaunaEvento[]>(consulta);
    itens.push(...lote);
    if (lote.length < limite) break;
  }
  if (itens.length > maximo) return null;
  return itens.sort((a, b) => compararInstantes(b.data, a.data) || compararTexto(b.id, a.id));
}
