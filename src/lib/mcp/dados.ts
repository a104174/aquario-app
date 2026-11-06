// Contratos existentes e consultas especializadas do MCP.
import type { SupabaseClient } from "@supabase/supabase-js";
import { faunaAtual, ultimosValores, volumeReferencia } from "@/lib/derivados";
import { proximoMarco } from "@/lib/ninhadas";
import { INFO_PARAMETROS } from "@/lib/parametros";
import { estadoStock } from "@/lib/produtos";
import { PARAMETROS, type Alerta, type FaunaEvento, type FonteExterna, type Medicao, type Ninhada, type Parametro, type Produto, type Tpa } from "@/lib/tipos";
import {
  aquarios, COL_FAUNA, COL_MEDICAO, COL_NINHADA, COL_PRODUTO, COL_TPA, compararInstantes, filtroFauna, historicoFauna,
  pagina, paginar, periodo, q, textoDado, type Cursor, type Periodo,
} from "./consultas";

const diasDesde = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

function avaliar(m: Medicao) {
  const valores: Record<string, number> = {};
  const fora: string[] = [];
  for (const p of PARAMETROS) {
    const v = m[p];
    if (v == null) continue;
    valores[p] = v;
    const f = INFO_PARAMETROS[p].faixa(v);
    if (f !== "ok") fora.push(`${INFO_PARAMETROS[p].curto} ${v} (${f === "mau" ? "fora da referência" : "atenção"})`);
  }
  return { valores, fora };
}

export async function ultimasTpas(sb: SupabaseClient, filtro: string | undefined, janela: Periodo, limite = 100) {
  const aqs = await aquarios(sb, filtro);
  if (!aqs.length) return [];
  const mapa = new Map(aqs.map((a) => [a.id, a]));
  const tpas = await pagina<Tpa>(sb, "tpas", COL_TPA, { periodo: janela, limite, filtrar: (c) => c.in("aquario_id", [...mapa.keys()]) });
  const itens = tpas.slice(0, limite);
  const ids = [...new Set(itens.flatMap((t) => t.condicionador_id ? [t.condicionador_id] : []))];
  const produtos = ids.length ? await q<Pick<Produto, "id" | "nome">[]>(sb.from("produtos").select("id,nome").in("id", ids).limit(limite)) : [];
  const nomes = new Map(produtos.map((p) => [p.id, p.nome]));
  return itens.map((t) => {
    const aq = mapa.get(t.aquario_id);
    const vol = volumeReferencia(aq);
    return {
      id: t.id, aquario_id: t.aquario_id, aquario: aq?.nome ?? t.aquario_id,
      data: t.data, litros: t.litros, percentagem: vol ? Math.round(t.litros / vol * 100) : null,
      volume_de_referencia: aq?.volume_util_l != null ? "util" : vol ? "bruto" : null,
      condicionador: t.condicionador_id ? nomes.get(t.condicionador_id) ?? null : null,
      condicionador_id: t.condicionador_id, dose_ml: t.dose_ml, notas: textoDado(t.notas),
    };
  });
}

export async function medicoes(sb: SupabaseClient, args: {
  aquario?: string; periodo: Periodo; parametro?: Parametro; limite: number; cursor?: Cursor;
}) {
  const aqs = await aquarios(sb, args.aquario);
  const nomes = new Map(aqs.map((a) => [a.id, a.nome]));
  const p = args.parametro;
  const colunas = p ? `id,aquario_id,data,metodo,notas,${p}` : COL_MEDICAO;
  const ms = aqs.length ? await pagina<Medicao>(sb, "medicoes", colunas, {
    ...args,
    filtrar: (c) => {
      const consulta = c.in("aquario_id", [...nomes.keys()]);
      return p ? consulta.not(p, "is", null) : consulta;
    },
  }) : [];
  const { itens, periodo, proximo_cursor } = paginar(ms, args.limite, args.periodo);
  const estatisticas = p ? aqs.map((a) => {
    const pontos = itens.filter((m) => m.aquario_id === a.id);
    const primeiro = pontos.at(-1);
    const ultimo = pontos[0];
    const intervaloDias = pontos.slice(1).reduce((max, m, i) =>
      Math.max(max, (Date.parse(pontos[i].data) - Date.parse(m.data)) / 86_400_000), 0);
    return {
      aquario_id: a.id, pontos: pontos.length, primeira_medicao_em: primeiro?.data ?? null,
      ultima_medicao_em: ultimo?.data ?? null,
      variacao_liquida: primeiro?.[p] != null && ultimo?.[p] != null && compararInstantes(primeiro.data, ultimo.data) !== 0
        ? Number((ultimo[p] - primeiro[p]).toPrecision(12)) : null,
      maior_intervalo_entre_medicoes_dias: pontos.length > 1 ? Number(intervaloDias.toFixed(3)) : null,
    };
  }) : undefined;
  return {
    referencias: Object.fromEntries((p ? [p] : PARAMETROS).map((chave) => [
      chave, { nome: INFO_PARAMETROS[chave].nome, unidade: INFO_PARAMETROS[chave].unidade, referencia: INFO_PARAMETROS[chave].referencia },
    ])),
    tipo_referencia: "generica_da_app",
    medicoes: itens.map((m) => ({
      id: m.id, aquario_id: m.aquario_id, aquario: nomes.get(m.aquario_id) ?? m.aquario_id,
      data: m.data, metodo: m.metodo, ...avaliar(m), notas: textoDado(m.notas),
    })),
    periodo, proximo_cursor, estatisticas_da_pagina: estatisticas,
  };
}

function eventoFauna(e: FaunaEvento, nomes: Map<string, string>) {
  return {
    id: e.id, data: e.data, tipo: e.tipo, especie: e.especie, quantidade: e.quantidade,
    origem: nomes.get(e.aquario_id) ?? e.aquario_id,
    destino: e.aquario_destino_id ? nomes.get(e.aquario_destino_id) ?? e.aquario_destino_id : null,
    aquario_id: e.aquario_id, aquario_destino_id: e.aquario_destino_id,
    variedade: e.variedade ?? null, nome_personalizado: e.nome_personalizado ?? null,
    grupo_id: e.grupo_proprio ? e.id : e.grupo_id ?? null, foto_id: e.foto_destaque_id ?? null,
    notas: textoDado(e.notas),
  };
}

export async function faunaENinhadas(sb: SupabaseClient, filtro: string | undefined, janela: Periodo, limite: number) {
  const aqs = await aquarios(sb, filtro);
  if (!aqs.length) return [];
  const ids = aqs.map((a) => a.id);
  const [todos, fauna, eventos, ninhadas] = await Promise.all([
    filtro ? aquarios(sb) : aqs,
    historicoFauna(sb, ids, new Date().toISOString()),
    pagina<FaunaEvento>(sb, "fauna_eventos", COL_FAUNA, { periodo: janela, limite, filtrar: (c) => c.neq("tipo", "detalhe").or(filtroFauna(ids)) }),
    q<Ninhada[]>(sb.from("ninhadas").select(COL_NINHADA).in("aquario_id", ids)
      .order("data_parto", { ascending: false }).order("id").limit(101)),
  ]);
  const nomes = new Map(todos.map((a) => [a.id, a.nome]));
  return aqs.map((a) => {
    const pop = fauna ? faunaAtual(fauna, a.id) : null;
    return {
      aquario: a.nome, aquario_id: a.id,
      populacao_total: pop?.total ?? null, especies: pop?.lista ?? [],
      historico_populacao_truncado: fauna === null,
      eventos_recentes: eventos.slice(0, limite).filter((e) => e.aquario_id === a.id || e.aquario_destino_id === a.id)
        .map((e) => eventoFauna(e, nomes)),
      eventos_truncados: eventos.length > limite,
      ninhadas: ninhadas.slice(0, 100).filter((n) => n.aquario_id === a.id).map((n) => {
        const prox = proximoMarco(n);
        return {
          id: n.id, mae: n.mae, data_parto: n.data_parto, estado: n.estado,
          proximo: prox ? { data: prox.quando.toISOString().slice(0, 10), acao: prox.texto } : null, notas: textoDado(n.notas),
        };
      }),
      ninhadas_truncadas: ninhadas.length > 100,
    };
  });
}

export async function alertasRecentes(sb: SupabaseClient, janela: Periodo, limite = 100, estado?: Alerta["estado"]) {
  const linhas = await pagina<Alerta>(sb, "alertas", "id,criado_em,tipo,titulo,mensagem,lido,canal,estado,adiado_ate,resolvido_em", {
    periodo: janela, limite, colunaData: "criado_em", filtrar: (c) => estado ? c.eq("estado", estado) : c,
  });
  return linhas.slice(0, limite).map((a) => ({ ...a, titulo: textoDado(a.titulo, 160), mensagem: textoDado(a.mensagem) }));
}

export async function listaDesejos(sb: SupabaseClient, estado?: "quero" | "comprado", limite = 100) {
  let consulta = sb.from("desejos").select("id,item,loja,link,preco,notas,estado,criado_em").order("criado_em", { ascending: false }).order("id").limit(limite);
  if (estado) consulta = consulta.eq("estado", estado);
  const itens = await q<{ notas: string | null }[]>(consulta);
  return itens.map((d) => ({ ...d, notas: textoDado(d.notas) }));
}

export async function novidadesExternas(sb: SupabaseClient, janela: Periodo, limite = 100) {
  const { data, error } = await sb.from("novidades_externas").select("id,titulo,url,detectado_em,resumo,fontes_externas(nome,tipo)")
    .gte("detectado_em", janela.de).lt("detectado_em", janela.ate)
    .order("detectado_em", { ascending: false }).order("id").limit(limite);
  if (error?.code === "42P01" || error?.code === "PGRST205") return { aviso: "Fontes externas ainda não configuradas.", novidades: [] };
  if (error) throw new Error("Falha na consulta de fontes externas");
  return data.map((n) => ({ ...n, titulo: textoDado(n.titulo, 160), resumo: textoDado(n.resumo) }));
}

export async function estadoFontes(sb: SupabaseClient) {
  type Fonte = Pick<FonteExterna, "id" | "nome" | "tipo" | "ultima_verificacao" | "resultado">;
  const fontes = await q<Fonte[]>(sb.from("fontes_externas").select("id,nome,tipo,ultima_verificacao,resultado")
    .eq("ativo", true).order("nome").order("id").limit(11));
  return {
    itens: fontes.slice(0, 10).map(({ resultado, ...fonte }) => {
      const resultadoTruncado = resultado !== null && JSON.stringify(resultado).length > 3500;
      return { ...fonte, resultado: resultadoTruncado ? null : resultado, resultado_truncado: resultadoTruncado };
    }),
    truncadas: fontes.length > 10,
    origem: "fontes_externas_da_app",
  };
}

export async function resumoAquarios(sb: SupabaseClient) {
  const aqs = await aquarios(sb);
  const [tpas, ms, fauna, ninhadas, produtos, definicoes] = await Promise.all([
    q<Tpa[]>(sb.from("tpas").select(COL_TPA).order("data", { ascending: false }).order("id").limit(501)),
    q<Medicao[]>(sb.from("medicoes").select(COL_MEDICAO).order("data", { ascending: false }).order("id").limit(501)),
    historicoFauna(sb),
    q<Ninhada[]>(sb.from("ninhadas").select(COL_NINHADA).neq("estado", "encerrada").order("id").limit(101)),
    q<Produto[]>(sb.from("produtos").select(COL_PRODUTO).eq("ativo", true).order("nome").order("id").limit(101)),
    q<{ intervalo_tpa_dias: number } | null>(sb.from("definicoes").select("intervalo_tpa_dias").maybeSingle()),
  ]);
  const intervalo = definicoes?.intervalo_tpa_dias ?? null;
  return {
    intervalo_tpa_dias: intervalo,
    aquarios: aqs.map((a) => {
      const ultima = tpas.find((t) => t.aquario_id === a.id);
      const valores = ultimosValores(ms, a.id);
      const pop = fauna ? faunaAtual(fauna, a.id) : null;
      return {
        id: a.id, nome: a.nome, volume_util_l: a.volume_util_l, volume_bruto_l: a.volume_bruto_l,
        ultima_tpa: ultima ? { id: ultima.id, data: ultima.data, dias: diasDesde(ultima.data), litros: ultima.litros } : null,
        tpa_em_atraso: ultima && intervalo !== null ? diasDesde(ultima.data) >= intervalo : null,
        ultimos_parametros: Object.fromEntries(
          Object.entries(valores).map(([chave, v]) => {
            const info = INFO_PARAMETROS[chave as Parametro];
            return [chave, { ...v, unidade: info.unidade, estado: info.faixa(v!.valor) }];
          }),
        ),
        fauna: { total: pop?.total ?? null, especies: pop?.lista ?? [] },
        ninhadas_ativas: ninhadas.slice(0, 100).filter((n) => n.aquario_id === a.id)
          .map((n) => ({ id: n.id, mae: n.mae, data_parto: n.data_parto, estado: n.estado })),
        notas: textoDado(a.notas),
      };
    }),
    produtos: produtos.slice(0, 100).map((p) => {
      const { nivel, resumo } = p.tipo === "condicionador" && tpas.length > 500
        ? { nivel: "desconhecido", resumo: "Histórico de consumo incompleto" } : estadoStock(p, tpas);
      return { id: p.id, nome: p.nome, tipo: p.tipo, nivel, resumo };
    }),
    truncados: { tpas: tpas.length > 500, medicoes: ms.length > 500, fauna: fauna === null, ninhadas: ninhadas.length > 100, produtos: produtos.length > 100 },
    tipo_referencia: "generica_da_app",
  };
}

async function contar(consulta: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await consulta;
  if (error) throw new Error("Falha na contagem de registos");
  return count;
}

export async function resumoSemanal(sb: SupabaseClient, janela = periodo({}, 7)) {
  const [estado, tpas, med, fauna, fotos, alertas, desejos, novidades] = await Promise.all([
    resumoAquarios(sb), ultimasTpas(sb, undefined, janela, 50), medicoes(sb, { periodo: janela, limite: 50 }),
    pagina<FaunaEvento>(sb, "fauna_eventos", COL_FAUNA, { periodo: janela, limite: 50, filtrar: (c) => c.neq("tipo", "detalhe") }),
    contar(sb.from("fotos").select("id", { count: "exact", head: true }).gte("data", janela.de).lt("data", janela.ate)),
    alertasRecentes(sb, janela, 30), contar(sb.from("desejos").select("id", { count: "exact", head: true }).eq("estado", "quero")),
    novidadesExternas(sb, janela, 30),
  ]);
  const nomes = new Map(estado.aquarios.map((a) => [a.id, a.nome]));
  return {
    periodo: { de: janela.de.slice(0, 10), ate: janela.ate.slice(0, 10) }, janela,
    estado_atual: estado, tpas_da_semana: tpas, medicoes_da_semana: med.medicoes,
    fauna_eventos_da_semana: fauna.slice(0, 50).map((e) => ({ aquario: nomes.get(e.aquario_id) ?? e.aquario_id, ...eventoFauna(e, nomes) })),
    fotos_da_semana: fotos, alertas_da_semana: alertas, desejos_por_comprar: desejos, novidades_externas: novidades,
    medicoes_proximo_cursor: med.proximo_cursor,
  };
}
