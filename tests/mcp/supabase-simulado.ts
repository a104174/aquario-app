import { compararInstantes, compararTexto } from "../../src/lib/mcp/consultas";

export const UID_A = "10000000-0000-4000-8000-000000000001";
export const UID_B = "10000000-0000-4000-8000-000000000002";
export const AQ_A = "20000000-0000-4000-8000-000000000001";
export const AQ_B = "20000000-0000-4000-8000-000000000002";
export const FOTO_A = "30000000-0000-4000-8000-000000000001";
export const FOTO_B = "30000000-0000-4000-8000-000000000002";
export const FOTO_MAU_CAMINHO = "30000000-0000-4000-8000-000000000003";
export const FOTO_GRANDE = "30000000-0000-4000-8000-000000000004";
export const EVENTO = "40000000-0000-4000-8000-000000000001";
export const MEIO = "2026-11-04T11:00:00.123456+00:00";
export const JANELA = { de: "2026-11-01T00:00:00Z", ate: "2026-11-07T00:00:00Z" };
const BASE = "https://supabase.test";

type Registo = Record<string, unknown>;
type Pedido = { tabela: string; url: URL; metodo: string; token: string | null };

function separar(expr: string) {
  const itens = [];
  let inicio = 0;
  let nivel = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "(") nivel++;
    if (expr[i] === ")") nivel--;
    if (expr[i] === "," && nivel === 0) {
      itens.push(expr.slice(inicio, i));
      inicio = i + 1;
    }
  }
  return [...itens, expr.slice(inicio)];
}

function comparar(a: string, b: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(a) && /^\d{4}-\d{2}-\d{2}T/.test(b)
    ? compararInstantes(a, b) : compararTexto(a, b);
}

function filtro(atual: unknown, condicao: string): boolean {
  const [op, valor] = condicao.split(/\.(.*)/s, 2);
  const texto = String(atual);
  switch (op) {
    case "eq": return texto === valor || comparar(texto, valor) === 0;
    case "neq": return texto !== valor;
    case "gt": return comparar(texto, valor) > 0;
    case "lt": return comparar(texto, valor) < 0;
    case "gte": return comparar(texto, valor) >= 0;
    case "lte": return comparar(texto, valor) <= 0;
    case "in": return separar(valor.slice(1, -1)).map((v) => v.replace(/^"|"$/g, "")).includes(texto);
    case "not": return valor === "is.null" && atual != null;
    case "ilike": return texto.toLowerCase().includes(valor.replace(/^%|%$/g, "").toLowerCase());
    default: throw new Error(`Operador não simulado: ${op}`);
  }
}

function logica(linha: Registo, expr: string): boolean {
  if (expr.startsWith("and(")) return separar(expr.slice(4, -1)).every((x) => logica(linha, x));
  const [chave, condicao] = expr.split(/\.(.*)/s, 2);
  return filtro(linha[chave], condicao);
}

const donoA = { user_id: UID_A, aquario_id: AQ_A };
const donoB = { user_id: UID_B, aquario_id: AQ_B };
const fotoA = {
  ...donoA, id: FOTO_A, data: MEIO, etiqueta: "plantas", legenda: "Plantas vermelhas",
  evento_tipo: "medicao", evento_id: EVENTO, storage_path: `${AQ_A}/2026/11/foto.jpg`, thumb_path: null,
};
const fotoB = {
  ...donoB, id: FOTO_B, data: MEIO, etiqueta: "plantas", legenda: "Segredo B",
  evento_tipo: null, evento_id: null, storage_path: `${AQ_B}/2026/11/foto.jpg`, thumb_path: null,
};

export function simularSupabase(imagem: Buffer) {
  const dados: Record<string, Registo[]> = {
    aquarios: [
      { id: AQ_A, user_id: UID_A, nome: "Principal", volume_bruto_l: 40, volume_util_l: 30, criado_em: JANELA.de, foto_capa_id: FOTO_A, notas: "LED nas notas" },
      { id: AQ_B, user_id: UID_B, nome: "Privado B", volume_bruto_l: 80, volume_util_l: null, criado_em: JANELA.de, foto_capa_id: FOTO_B, notas: null },
    ],
    medicoes: [
      { ...donoA, id: EVENTO, data: MEIO, ph: 7, no2: 0, gh: null, notas: null, metodo: "gotas" },
      { ...donoA, id: FOTO_A, data: MEIO, ph: 7.2, no2: null, notas: null, metodo: "tira" },
      { ...donoA, id: "40000000-0000-4000-8000-000000000002", data: "2026-11-04T12:00:00.123455+01:00", ph: 6.9, no2: null, notas: null, metodo: "tira" },
      { ...donoA, id: "40000000-0000-4000-8000-000000000003", data: JANELA.ate, ph: 7.5, no2: null, notas: null, metodo: "tira" },
      { ...donoB, id: EVENTO, data: MEIO, ph: 8, no2: 1, notas: "Segredo B" },
    ],
    fotos: [
      fotoA, fotoB,
      { ...fotoA, id: FOTO_MAU_CAMINHO, etiqueta: "outro", storage_path: fotoB.storage_path },
      { ...fotoA, id: FOTO_GRANDE, etiqueta: "outro", storage_path: `${AQ_A}/grande.jpg` },
    ],
    tpas: [{ ...donoA, id: "50000000-0000-4000-8000-000000000001", data: JANELA.de, litros: 10, condicionador_id: null, dose_ml: null, notas: null }],
    fauna_eventos: [{ ...donoA, id: EVENTO, data: JANELA.de, especie: "Guppy", quantidade: 3, tipo: "entrada",
      variedade: "Endler", nome_personalizado: "Grupo A", foto_destaque_id: FOTO_A, grupo_proprio: true, grupo_id: null,
      aquario_destino_id: null, notas: null }],
    ninhadas: [], produtos: [], definicoes: [{ user_id: UID_A, intervalo_tpa_dias: 7, lembrete_esponja: true }],
    alertas: [
      { user_id: UID_A, id: FOTO_A, criado_em: MEIO, estado: "pendente", titulo: "Ver aquário", tipo: "tpa" },
      { user_id: UID_A, id: FOTO_GRANDE, criado_em: MEIO, estado: "resolvido", titulo: "Já tratado", tipo: "tpa" },
    ],
    desejos: [], novidades_externas: [],
    fontes_externas: [
      { user_id: UID_A, id: EVENTO, nome: "AGERE", tipo: "agere_qualidade", ativo: true, url: null,
        ultima_verificacao: MEIO, resultado: { ph: { min: 7, max: 8 } }, configuracao: { teste: "privado" } },
    ],
  };
  const pedidos: Pedido[] = [];
  const indisponiveis = new Set<string>();
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const token = req.headers.get("authorization");
    const uid = token === "Bearer token-a" ? UID_A : token === "Bearer token-b" ? UID_B : null;
    const tabela = url.pathname.split("/").at(-1)!;
    if (url.origin !== BASE) throw new Error("O teste recebeu um pedido externo");
    pedidos.push({ tabela, url, metodo: req.method, token });

    if (!uid) return Response.json({ msg: "bad_jwt", code: "bad_jwt" }, { status: 401 });
    if (url.pathname === "/auth/v1/user") {
      return Response.json({ id: uid, email: uid === UID_A ? "a@example.test" : "b@example.test", aud: "authenticated" });
    }
    if (url.pathname === "/storage/v1/object/sign/fotos" && req.method === "POST") {
      const { paths } = await req.json();
      return Response.json(paths.map((path: string) => ({
        path, signedURL: path.startsWith(uid === UID_A ? AQ_A : AQ_B) ? `/object/sign/fotos/${path}?token=simulado` : null,
      })));
    }
    if (url.pathname.startsWith("/storage/v1/object/fotos/")) {
      const prefixo = uid === UID_A ? AQ_A : AQ_B;
      if (!url.pathname.startsWith(`/storage/v1/object/fotos/${prefixo}/`)) return Response.json({ message: "private" }, { status: 404 });
      if (tabela === "grande.jpg") {
        const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1)); controller.close(); } });
        return new Response(stream, { headers: { "Content-Type": "image/jpeg" } });
      }
      return new Response(new Uint8Array(imagem), { headers: { "Content-Type": "image/jpeg" } });
    }
    if (!url.pathname.startsWith("/rest/v1/") || !(tabela in dados) || !["GET", "HEAD"].includes(req.method)) {
      throw new Error(`Pedido não simulado: ${req.method} ${url.pathname}`);
    }
    if (indisponiveis.has(tabela)) return Response.json({ code: "XX000", message: "Detalhe interno e segredo" }, { status: 500 });

    // Cada tabela simula a RLS por utilizador e aplica os filtros recebidos pelo SDK real.
    let linhas = dados[tabela].filter((r) => r.user_id === uid);
    for (const [chave, valor] of url.searchParams) {
      if (chave === "or") linhas = linhas.filter((r) => separar(valor.slice(1, -1)).some((x) => logica(r, x)));
      else if (!["order", "select", "limit"].includes(chave) && !chave.includes(".")) linhas = linhas.filter((r) => filtro(r[chave], valor));
    }
    const ordem = (url.searchParams.get("order") ?? "").split(",").filter(Boolean).map((o) => o.split("."));
    linhas.sort((a, b) => {
      for (const [chave, sentido] of ordem) {
        const cmp = comparar(String(a[chave]), String(b[chave]));
        if (cmp) return sentido === "desc" ? -cmp : cmp;
      }
      return 0;
    });
    const limite = Number(url.searchParams.get("limit") ?? 1000);
    const colunas = separar(url.searchParams.get("select") ?? "*");
    const resultado = linhas.slice(0, limite).map((r) => Object.fromEntries(colunas.map((c) => {
      if (c.startsWith("medicoes(") || c.startsWith("tpas(")) {
        const tabelaFilha = c.split("(")[0];
        const limiteFilhos = Number(url.searchParams.get(tabelaFilha + ".limit"));
        const lista = dados[tabelaFilha].filter((f) => f.user_id === uid && f.aquario_id === r.id)
          .sort((a, b) => comparar(String(b.data), String(a.data)));
        return [tabelaFilha, lista.slice(0, limiteFilhos)];
      }
      return [c, r[c]];
    })));
    if (req.method === "HEAD") return new Response(null, { headers: { "content-range": `*/${linhas.length}` } });
    return Response.json(resultado);
  };
  return { fetch, pedidos, indisponiveis, dados };
}
