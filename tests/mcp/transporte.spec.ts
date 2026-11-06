import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { POST } from "../../src/app/api/mcp/route";
import { clienteDoUtilizador } from "../../src/lib/mcp/consultas";
import {
  AQ_A, AQ_B, EVENTO, FOTO_A, FOTO_B, FOTO_GRANDE, FOTO_MAU_CAMINHO, JANELA, MEIO, simularSupabase,
} from "./supabase-simulado";

const endpoint = "https://aquario.test/api/mcp";
const protocolo = "2025-11-25";
let imagem: Buffer;
let supabase: ReturnType<typeof simularSupabase>;
const fetchReal = globalThis.fetch;

test.beforeAll(async () => {
  imagem = await sharp({ create: { width: 1600, height: 800, channels: 3, background: "#218261" } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
});

test.beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-simulado";
  delete process.env.MCP_EMAILS_PERMITIDOS;
  supabase = simularSupabase(imagem);
  globalThis.fetch = supabase.fetch;
});

test.afterEach(() => {
  globalThis.fetch = fetchReal;
  delete process.env.MCP_EMAILS_PERMITIDOS;
});

function pedido(metodo: string, params: object, token: string | null = "token-a") {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": protocolo,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return POST(new Request(endpoint, {
    method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: metodo, params }),
  }));
}

async function resultado(metodo: string, params: object, token?: string) {
  const resposta = await pedido(metodo, params, token);
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get("cache-control")).toBe("private, no-store");
  const corpo = await resposta.text();
  const mensagem = corpo.trimStart().startsWith("{")
    ? corpo
    : corpo.split("\n").find((linha) => linha.startsWith("data: "))?.slice(6);
  expect(mensagem).toBeTruthy();
  return JSON.parse(mensagem!);
}

async function chamar(nome: string, args?: object, token?: string) {
  return resultado("tools/call", { name: nome, arguments: args }, token);
}

async function dados(nome: string, args?: object, token?: string) {
  const { result, error } = await chamar(nome, args, token);
  expect(error).toBeUndefined();
  expect(result.isError).not.toBe(true);
  return JSON.parse(result.content[0].text);
}

test("inicializa e publica as ferramentas antigas e novas como só de leitura", async () => {
  const { result } = await resultado("initialize", {
    protocolVersion: protocolo, capabilities: {}, clientInfo: { name: "teste-transporte", version: "1.0" },
  });
  expect(result.serverInfo.name).toBe("aquario");
  expect(result.instructions).toContain("dados não confiáveis");
  const { result: { tools } } = await resultado("tools/list", {});
  expect(tools.map((t: { name: string }) => t.name).sort()).toEqual([
    "alertas_recentes", "conteudo_foto", "contexto_aquario", "fauna_e_ninhadas", "fotos_recentes", "linha_temporal",
    "lista_desejos", "medicoes", "novidades_externas", "resumo_aquarios", "resumo_semanal", "ultimas_tpas",
  ]);
  for (const tool of tools) expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
});

test("exige token válido, respeita a allowlist e bloqueia operações de escrita", async () => {
  const semToken = await pedido("tools/list", {}, null);
  expect(semToken.status).toBe(401);
  expect(semToken.headers.get("www-authenticate")).toContain("oauth-protected-resource");
  expect((await pedido("tools/list", {}, "invalido")).status).toBe(401);
  process.env.MCP_EMAILS_PERMITIDOS = " a@example.test ";
  expect((await pedido("tools/list", {}, "token-b")).status).toBe(401);
  expect((await pedido("tools/list", {}, "token-a")).status).toBe(200);
  const n = supabase.pedidos.length;
  const { error } = await clienteDoUtilizador("token-a").from("aquarios").update({ nome: "indevido" }).eq("id", AQ_A);
  expect(error).toBeTruthy();
  expect(supabase.pedidos).toHaveLength(n);
});

test("rejeita UUIDs, datas e limites inválidos antes de consultar os dados", async () => {
  for (const [nome, args] of [
    ["conteudo_foto", { id: "../a" }], ["medicoes", { limite: 5000 }],
    ["linha_temporal", { de: "2026-11-01T00:00:00" }], ["linha_temporal", { de: JANELA.ate, ate: JANELA.de }],
    ["medicoes", { de: "2020-01-01T00:00:00Z", ate: JANELA.ate }],
    ["linha_temporal", { cursor: { id: "x", data: MEIO, tipo: "foto" } }],
  ] as const) {
    const resultado = await chamar(nome, args);
    expect(Boolean(resultado.error || resultado.result?.isError)).toBe(true);
  }
  expect(supabase.pedidos.every((p) => p.url.pathname === "/auth/v1/user")).toBe(true);
});

test("resumos e contexto usam o JWT certo e distinguem zero, ausência e derivados", async () => {
  const compacto = await dados("resumo_aquarios", { modo: "compacto" });
  expect(compacto.aquarios.map((a: { id: string }) => a.id)).toEqual([AQ_A]);
  expect(compacto.alertas_ativos_da_conta.map((a: { estado: string }) => a.estado)).toEqual(["pendente"]);
  const contexto = await dados("contexto_aquario", { aquario: AQ_A, ...JANELA, incluir_produtos: false });
  expect(contexto.aquario).toMatchObject({ id: AQ_A, volume_util_l: 30, foto_capa_id: FOTO_A });
  expect(contexto.agua.ultimos_parametros.no2).toMatchObject({ valor: 0, unidade: "mg/L", medicao_id: EVENTO });
  expect(contexto.agua.ultimos_parametros.gh).toBeNull();
  expect(contexto.manutencao.ultima_tpa.percentagem_volume_util).toBe(33);
  expect(contexto.fauna.grupos[0]).toMatchObject({ variedade: "Endler", quantidade: 3, foto_id: FOTO_A });
  expect(contexto.produtos_da_conta).toBeNull();
  expect(JSON.stringify(contexto)).not.toMatch(/Segredo B|storage_path|user_id/);
  const { result } = await chamar("contexto_aquario", { aquario: AQ_B });
  expect(result.isError).toBe(true);
  const outro = await dados("resumo_aquarios", { modo: "compacto" }, "token-b");
  expect(outro.aquarios.map((a: { id: string }) => a.id)).toEqual([AQ_B]);
  expect(supabase.pedidos.filter((p) => p.url.pathname.includes("/rest/")).every((p) => p.token === "Bearer token-a" || p.token === "Bearer token-b")).toBe(true);
});

test("pagina cronologicamente com empates entre tabelas e conserva microssegundos e fusos", async () => {
  let cursor: object | undefined;
  const todos: { tipo: string; id: string; data: string }[] = [];
  do {
    const pagina = await dados("linha_temporal", { aquario: AQ_A, ...JANELA, tipos: ["medicao", "foto"], limite: 1, cursor });
    expect(pagina.eventos).toHaveLength(1);
    todos.push(pagina.eventos[0]);
    cursor = pagina.proximo_cursor ?? undefined;
    expect(todos.length).toBeLessThanOrEqual(6);
  } while (cursor);
  expect(todos.map(({ tipo, id }) => [tipo, id])).toEqual([
    ["medicao", EVENTO], ["foto", FOTO_GRANDE], ["foto", FOTO_MAU_CAMINHO], ["medicao", FOTO_A], ["foto", FOTO_A],
    ["medicao", "40000000-0000-4000-8000-000000000002"],
  ]);
  expect(todos.every(({ data }) => data !== JANELA.ate)).toBe(true);
  expect(todos.at(-1)?.data).toContain("+01:00");

  const ph = await dados("medicoes", { aquario: AQ_A, ...JANELA, parametro: "ph", limite: 2 });
  expect(ph.medicoes.map((m: { valores: object }) => m.valores)).toEqual([{ ph: 7 }, { ph: 7.2 }]);
  const prox = await dados("medicoes", { aquario: AQ_A, ...ph.periodo, parametro: "ph", limite: 2, cursor: ph.proximo_cursor });
  expect(prox.medicoes[0].valores).toEqual({ ph: 6.9 });
});

test("lista metadados sem Storage e envia bytes JPEG redimensionados e orientados", async () => {
  const lista = await dados("fotos_recentes", {
    aquario: AQ_A, ...JANELA, modo: "metadados", etiqueta: "plantas", evento_id: EVENTO,
  });
  expect(lista.itens).toEqual([expect.objectContaining({ id: FOTO_A, evento_id: EVENTO, etiqueta: "plantas" })]);
  expect(JSON.stringify(lista)).not.toMatch(/"url"|storage_path|thumb_path|simulado/);
  const filtros = { ...JANELA, aquario: AQ_A, modo: "metadados", ordem: "asc", limite: 1 };
  const primeira = await dados("fotos_recentes", filtros);
  const segunda = await dados("fotos_recentes", { ...filtros, ...primeira.periodo, cursor: primeira.proximo_cursor });
  expect(primeira.itens[0].id).toBe(FOTO_A);
  expect(segunda.itens[0].id).toBe(FOTO_MAU_CAMINHO);
  expect(supabase.pedidos.every((p) => !p.url.pathname.includes("/storage/"))).toBe(true);
  const { result } = await chamar("conteudo_foto", { id: FOTO_A });
  expect(result.isError).toBeUndefined();
  const [texto, imagem] = result.content;
  expect(JSON.parse(texto.text)).toMatchObject({ id: FOTO_A, evento_id: EVENTO, largura: 640, altura: 1280 });
  expect(imagem).toMatchObject({ type: "image", mimeType: "image/jpeg" });
  const bytes = Buffer.from(imagem.data, "base64");
  expect(bytes.length).toBeLessThanOrEqual(512 * 1024);
  const jpeg = await sharp(bytes).metadata();
  expect(jpeg).toMatchObject({ format: "jpeg", width: 640, height: 1280 });
  expect(jpeg.exif).toBeUndefined();
  const miniatura = await chamar("conteudo_foto", { id: FOTO_B, tamanho: "miniatura" }, "token-b");
  expect(JSON.parse(miniatura.result.content[0].text)).toMatchObject({ id: FOTO_B, largura: 240, altura: 480 });
});

test("não lê ficheiros alheios, caminhos inconsistentes ou imagens acima do limite", async () => {
  for (const id of [FOTO_B, FOTO_MAU_CAMINHO]) {
    const { result } = await chamar("conteudo_foto", { id });
    expect(result.isError).toBe(true);
    expect(result.content.every((c: { type: string }) => c.type === "text")).toBe(true);
  }
  expect(supabase.pedidos.every((p) => !p.url.pathname.includes("/storage/"))).toBe(true);
  const { result } = await chamar("conteudo_foto", { id: FOTO_GRANDE });
  expect(result.isError).toBe(true);
  expect(supabase.pedidos.filter((p) => p.url.pathname.includes("/storage/"))).toHaveLength(1);
});

test("preserva as respostas anteriores e usa uma janela contígua no resumo incremental", async () => {
  const resumo = await dados("resumo_aquarios");
  expect(resumo).toMatchObject({ intervalo_tpa_dias: 7, aquarios: [{ nome: "Principal" }], produtos: [] });
  const tpas = await dados("ultimas_tpas", { ...JANELA });
  expect(tpas[0]).toMatchObject({ aquario: "Principal", litros: 10, percentagem: 33, condicionador: null });
  const fotos = await dados("fotos_recentes", { ...JANELA, etiqueta: "plantas" });
  expect(fotos[0]).toMatchObject({ aquario: "Principal", ligada_a: "medicao", url: expect.stringContaining("token=simulado"), url_expira_em_minutos: 10 });
  const semanal = await dados("resumo_semanal", JANELA);
  expect(semanal).toMatchObject({ fotos_da_semana: 3, desejos_por_comprar: 0, estado_atual: { aquarios: [{ nome: "Principal" }] } });
  const desde = supabase.pedidos.length;
  const incremental = await dados("resumo_semanal", { ...JANELA, modo: "incremental" });
  expect(incremental.proximo_inicio).toBe(JANELA.ate);
  expect(supabase.pedidos.slice(desde).filter((p) => p.tabela === "fauna_eventos")
    .every((p) => p.url.searchParams.has("data"))).toBe(true);
  const seguinte = await dados("resumo_semanal", { de: incremental.proximo_inicio, ate: "2026-11-08T00:00:00Z", modo: "incremental" });
  expect(seguinte.linha_temporal.eventos.map((e: { data: string }) => e.data)).toEqual([JANELA.ate]);
});

test("não divulga erros internos do Supabase nem os converte em dados vazios", async () => {
  supabase.indisponiveis.add("medicoes");
  const { result } = await chamar("medicoes", JANELA);
  expect(result.isError).toBe(true);
  expect(result.content[0].text).not.toContain("segredo");
});

test("distingue o estado das fontes externas e omite a configuração privada", async () => {
  const anterior = await dados("novidades_externas", JANELA);
  expect(Array.isArray(anterior)).toBe(true);
  const atual = await dados("novidades_externas", { ...JANELA, incluir_estado: true });
  expect(atual.estado_fontes).toMatchObject({
    origem: "fontes_externas_da_app",
    itens: [{ tipo: "agere_qualidade", resultado: { ph: { min: 7, max: 8 } }, ultima_verificacao: MEIO }],
  });
  expect(JSON.stringify(atual)).not.toContain("configuracao");
});
