// Consultas do servidor MCP. Correm SEMPRE com o token OAuth do utilizador,
// por isso a RLS do Postgres garante que só os dados dele são lidos.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { faunaAtual, ultimosValores } from "@/lib/derivados";
import { proximoMarco } from "@/lib/ninhadas";
import { INFO_PARAMETROS } from "@/lib/parametros";
import { estadoStock } from "@/lib/produtos";
import { PARAMETROS, type Aquario, type FaunaEvento, type Medicao, type Ninhada, type Produto, type Tpa } from "@/lib/tipos";

export function clienteDoUtilizador(token: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const desde = (dias: number) => new Date(Date.now() - dias * 864e5).toISOString();
const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);

async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

/** Aquários que correspondem ao filtro (id exato ou parte do nome). */
export async function aquarios(sb: SupabaseClient, filtro?: string) {
  const todos = await q<Aquario[]>(sb.from("aquarios").select("*").order("criado_em"));
  if (!filtro) return todos;
  const f = filtro.trim().toLocaleLowerCase("pt-PT");
  const r = todos.filter((a) => a.id === filtro || a.nome.toLocaleLowerCase("pt-PT").includes(f));
  if (!r.length) throw new Error(`Nenhum aquário corresponde a "${filtro}". Disponíveis: ${todos.map((a) => a.nome).join(", ")}`);
  return r;
}

const nomeDe = (lista: Aquario[]) => (id: string) => lista.find((a) => a.id === id)?.nome ?? id;

function avaliar(m: Medicao) {
  const valores: Record<string, number> = {};
  const fora: string[] = [];
  for (const p of PARAMETROS) {
    const v = m[p];
    if (v == null) continue;
    valores[p] = Number(v);
    const f = INFO_PARAMETROS[p].faixa(Number(v));
    if (f !== "ok") fora.push(`${INFO_PARAMETROS[p].curto} ${v} (${f === "mau" ? "fora da referência" : "atenção"})`);
  }
  return { valores, fora };
}

export async function ultimasTpas(sb: SupabaseClient, aquario?: string, dias = 30) {
  const aqs = await aquarios(sb, aquario);
  const nome = nomeDe(aqs);
  const [tpas, produtos] = await Promise.all([
    q<Tpa[]>(sb.from("tpas").select("*").in("aquario_id", aqs.map((a) => a.id)).gte("data", desde(dias)).order("data", { ascending: false })),
    q<Produto[]>(sb.from("produtos").select("*")),
  ]);
  return tpas.map((t) => {
    const aq = aqs.find((a) => a.id === t.aquario_id);
    const vol = aq?.volume_util_l ?? aq?.volume_bruto_l;
    return {
      aquario: nome(t.aquario_id),
      data: t.data,
      litros: Number(t.litros),
      percentagem: vol ? Math.round((Number(t.litros) / Number(vol)) * 100) : null,
      condicionador: produtos.find((p) => p.id === t.condicionador_id)?.nome ?? null,
      dose_ml: t.dose_ml,
      notas: t.notas,
    };
  });
}

export async function medicoes(sb: SupabaseClient, aquario?: string, dias = 30) {
  const aqs = await aquarios(sb, aquario);
  const nome = nomeDe(aqs);
  const ms = await q<Medicao[]>(
    sb.from("medicoes").select("*").in("aquario_id", aqs.map((a) => a.id)).gte("data", desde(dias)).order("data", { ascending: false }),
  );
  return {
    referencias: Object.fromEntries(PARAMETROS.map((p) => [p, { nome: INFO_PARAMETROS[p].nome, unidade: INFO_PARAMETROS[p].unidade, referencia: INFO_PARAMETROS[p].referencia }])),
    medicoes: ms.map((m) => ({ aquario: nome(m.aquario_id), data: m.data, metodo: m.metodo, ...avaliar(m), notas: m.notas })),
  };
}

export async function faunaENinhadas(sb: SupabaseClient, aquario?: string) {
  const aqs = await aquarios(sb, aquario);
  const todos = await aquarios(sb);
  const nome = nomeDe(todos);
  const [fauna, ninhadas] = await Promise.all([
    q<FaunaEvento[]>(sb.from("fauna_eventos").select("*").order("data", { ascending: false })),
    q<Ninhada[]>(sb.from("ninhadas").select("*").in("aquario_id", aqs.map((a) => a.id)).order("data_parto", { ascending: false })),
  ]);
  return aqs.map((a) => {
    const pop = faunaAtual(fauna, a.id);
    return {
      aquario: a.nome,
      populacao_total: pop.total,
      especies: pop.lista,
      eventos_recentes: fauna
        .filter((e) => e.tipo !== "detalhe" && (e.aquario_id === a.id || e.aquario_destino_id === a.id) && diasDesde(e.data) <= 60)
        .map((e) => ({ data: e.data, tipo: e.tipo, especie: e.especie, quantidade: e.quantidade, origem: nome(e.aquario_id), destino: e.aquario_destino_id ? nome(e.aquario_destino_id) : null, notas: e.notas })),
      ninhadas: ninhadas
        .filter((n) => n.aquario_id === a.id)
        .map((n) => {
          const prox = proximoMarco(n);
          return { mae: n.mae, data_parto: n.data_parto, estado: n.estado, proximo: prox ? { data: prox.quando.toISOString().slice(0, 10), acao: prox.texto } : null, notas: n.notas };
        }),
    };
  });
}

export async function fotosRecentes(sb: SupabaseClient, aquario?: string, dias = 14) {
  const aqs = await aquarios(sb, aquario);
  const nome = nomeDe(aqs);
  const fotos = await q<{ aquario_id: string; data: string; storage_path: string; etiqueta: string; legenda: string | null; evento_tipo: string | null }[]>(
    sb.from("fotos").select("aquario_id, data, storage_path, etiqueta, legenda, evento_tipo").in("aquario_id", aqs.map((a) => a.id)).gte("data", desde(dias)).order("data", { ascending: false }).limit(50),
  );
  if (!fotos.length) return [];
  const { data: urls } = await sb.storage.from("fotos").createSignedUrls(fotos.map((f) => f.storage_path), 60 * 60);
  return fotos.map((f, i) => ({
    aquario: nome(f.aquario_id),
    data: f.data,
    etiqueta: f.etiqueta,
    legenda: f.legenda,
    ligada_a: f.evento_tipo,
    url: urls?.[i]?.signedUrl ?? null,
    url_expira_em_minutos: 60,
  }));
}

export async function alertasRecentes(sb: SupabaseClient, dias = 14) {
  return q(sb.from("alertas").select("criado_em, tipo, titulo, mensagem, lido, canal").gte("criado_em", desde(dias)).order("criado_em", { ascending: false }));
}

export async function listaDesejos(sb: SupabaseClient, estado?: "quero" | "comprado") {
  let qb = sb.from("desejos").select("item, loja, link, preco, notas, estado, criado_em").order("criado_em", { ascending: false });
  if (estado) qb = qb.eq("estado", estado);
  return q(qb);
}

export async function novidadesExternas(sb: SupabaseClient, dias = 14) {
  const { data, error } = await sb
    .from("novidades_externas")
    .select("titulo, url, detectado_em, resumo, fontes_externas(nome, tipo)")
    .gte("detectado_em", desde(dias))
    .order("detectado_em", { ascending: false })
    .limit(100);
  if (error) return { aviso: "Fontes externas ainda não configuradas.", novidades: [] };
  return data;
}

export async function resumoAquarios(sb: SupabaseClient) {
  const aqs = await aquarios(sb);
  const [tpas, ms, fauna, ninhadas, produtos, def] = await Promise.all([
    q<Tpa[]>(sb.from("tpas").select("*").order("data", { ascending: false }).limit(500)),
    q<Medicao[]>(sb.from("medicoes").select("*").order("data", { ascending: false }).limit(500)),
    q<FaunaEvento[]>(sb.from("fauna_eventos").select("*")),
    q<Ninhada[]>(sb.from("ninhadas").select("*").neq("estado", "encerrada")),
    q<Produto[]>(sb.from("produtos").select("*").eq("ativo", true)),
    sb.from("definicoes").select("intervalo_tpa_dias, aviso_tpa_urgente_dias").maybeSingle(),
  ]);
  const intervalo = def.data?.intervalo_tpa_dias ?? 7;
  return {
    intervalo_tpa_dias: intervalo,
    aquarios: aqs.map((a) => {
      const ultima = tpas.find((t) => t.aquario_id === a.id);
      const valores = ultimosValores(ms, a.id);
      const pop = faunaAtual(fauna, a.id);
      return {
        nome: a.nome,
        volume_util_l: a.volume_util_l,
        volume_bruto_l: a.volume_bruto_l,
        ultima_tpa: ultima ? { data: ultima.data, dias: diasDesde(ultima.data), litros: Number(ultima.litros) } : null,
        tpa_em_atraso: ultima ? diasDesde(ultima.data) >= intervalo : true,
        ultimos_parametros: Object.fromEntries(
          Object.entries(valores).map(([p, v]) => [p, { valor: v!.valor, data: v!.data, estado: INFO_PARAMETROS[p as keyof typeof INFO_PARAMETROS].faixa(v!.valor) }]),
        ),
        fauna: { total: pop.total, especies: pop.lista },
        ninhadas_ativas: ninhadas.filter((n) => n.aquario_id === a.id).map((n) => ({ mae: n.mae, data_parto: n.data_parto, estado: n.estado })),
        notas: a.notas,
      };
    }),
    produtos: produtos.map((p) => ({ nome: p.nome, tipo: p.tipo, ...(({ nivel, resumo }) => ({ nivel, resumo }))(estadoStock(p, tpas)) })),
  };
}

export async function resumoSemanal(sb: SupabaseClient) {
  const [estado, tpas, med, fauna, fotos, alertas, desejos, novidades] = await Promise.all([
    resumoAquarios(sb),
    ultimasTpas(sb, undefined, 7),
    medicoes(sb, undefined, 7),
    faunaENinhadas(sb),
    q<{ aquario_id: string }[]>(sb.from("fotos").select("aquario_id").gte("data", desde(7))),
    alertasRecentes(sb, 7),
    listaDesejos(sb, "quero"),
    novidadesExternas(sb, 7),
  ]);
  return {
    periodo: { de: desde(7).slice(0, 10), ate: new Date().toISOString().slice(0, 10) },
    estado_atual: estado,
    tpas_da_semana: tpas,
    medicoes_da_semana: med.medicoes,
    fauna_eventos_da_semana: fauna.flatMap((f) => f.eventos_recentes.filter((e) => diasDesde(e.data) <= 7).map((e) => ({ aquario: f.aquario, ...e }))),
    fotos_da_semana: fotos.length,
    alertas_da_semana: alertas,
    desejos_por_comprar: Array.isArray(desejos) ? desejos.length : 0,
    novidades_externas: novidades,
  };
}
