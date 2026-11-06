// Verificadores de fontes externas (sem IA, sem base de dados).
// Cada um devolve { itens, resultado?, estado? }:
//  • itens: candidatos a novidade (hash único por fonte → só entra o que é novo)
//  • resultado: o que a app mostra (ex.: previsão, valores da água)
//  • estado: o que fica guardado para comparar na próxima verificação

export type Item = {
  hash: string;
  titulo: string;
  url?: string | null;
  resumo?: string | null;
  dados?: unknown;
  alerta?: { tipo: string; titulo: string; mensagem: string } | null;
};
export type Saida = { itens: Item[]; resultado?: unknown; estado?: unknown };
type Cfg = Record<string, unknown>;

const UA = "AquarioApp/1.0 (diário pessoal de aquários; +https://aquario-delta.vercel.app)";

/** fetch com timeout e 3 tentativas (espera 1 s, 3 s). */
export async function obter(url: string, init: RequestInit = {}): Promise<Response> {
  let ultimo: unknown;
  for (const espera of [0, 1000, 3000]) {
    if (espera) await new Promise((r) => setTimeout(r, espera));
    try {
      const r = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(25_000) });
      if (r.status >= 500 || r.status === 429) {
        ultimo = new Error(`HTTP ${r.status} em ${url}`);
        continue;
      }
      return r;
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error(String(ultimo));
}

export const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const entidades: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'", "#8217": "’", "#8211": "–", nbsp: " ", "#8216": "‘" };
export const semHtml = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#?\w+);/g, (m, e) => entidades[e] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : m))
    .replace(/[ \t]+/g, " ")
    .trim();

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "sex, 6 nov" (data AAAA-MM-DD ou ISO com hora local) */
const dia = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d, 12));
  return `${SEMANA[dt.getUTCDay()]}, ${d} ${MESES[m - 1]}`;
};
const hojeLisboa = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date()); // AAAA-MM-DD
const num = (n: number, d = 1) => n.toLocaleString("pt-PT", { maximumFractionDigits: d });

// ---------------------------------------------------------------------
// 1) Meteorologia (Open-Meteo, sem chave)
// ---------------------------------------------------------------------
export async function meteo(cfg: Cfg): Promise<Saida> {
  const lat = Number(cfg.latitude ?? 41.5454);
  const lon = Number(cfg.longitude ?? -8.4265);
  const max = Number(cfg.max_alerta ?? 30);
  const min = Number(cfg.min_alerta ?? 5);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FLisbon&forecast_days=3`;
  const r = await obter(url);
  if (!r.ok) throw new Error(`Open-Meteo: HTTP ${r.status}`);
  const j = await r.json();
  const dias = (j.daily.time as string[]).map((d, i) => ({ data: d, max: j.daily.temperature_2m_max[i] as number, min: j.daily.temperature_2m_min[i] as number }));
  const itens: Item[] = [];
  for (const d of dias) {
    if (d.max >= max)
      itens.push({
        hash: `calor:${d.data}`,
        titulo: `Calor: máx. ${num(d.max)} °C (${dia(d.data)})`,
        resumo: "Risco de o aquário passar 28 °C.",
        dados: d,
        alerta: { tipo: "meteo", titulo: `Calor em Braga: ${num(d.max)} °C (${dia(d.data)})`, mensagem: "Risco de o aquário passar 28 °C: tampa aberta, ventoinha e luz mais cedo." },
      });
    if (d.min <= min)
      itens.push({
        hash: `frio:${d.data}`,
        titulo: `Frio: mín. ${num(d.min)} °C (${dia(d.data)})`,
        resumo: "Confirma o aquecedor.",
        dados: d,
        alerta: { tipo: "meteo", titulo: `Frio em Braga: ${num(d.min)} °C (${dia(d.data)})`, mensagem: "Confirma que o aquecedor está ligado e a funcionar." },
      });
  }
  return { itens, resultado: { dias, limites: { max, min } } };
}

// ---------------------------------------------------------------------
// 2) Cortes de luz — E-REDES (dados abertos: network-scheduling-work)
// ---------------------------------------------------------------------
type LinhaEredes = { zipcode: string; municipality: string; parish: string; startdatetime: string; enddatetime: string; data: string };

export async function eredes(cfg: Cfg): Promise<Saida> {
  const concelho = String(cfg.concelho ?? "Braga").trim();
  const cps = ((cfg.codigos_postais as string[]) ?? []).map((c) => c.replace(/\s/g, "")).filter(Boolean);
  const base = "https://e-redes.opendatasoft.com/api/explore/v2.1/catalog/datasets/network-scheduling-work/records";
  const where = encodeURIComponent(`municipality="${concelho.replace(/"/g, "")}"`);
  const linhas: LinhaEredes[] = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const r = await obter(`${base}?where=${where}&limit=100&offset=${offset}&order_by=startdatetime`);
    if (!r.ok) throw new Error(`E-REDES: HTTP ${r.status}`);
    const j = await r.json();
    linhas.push(...(j.results as LinhaEredes[]));
    if (linhas.length >= j.total_count || !j.results.length) break;
  }
  const hoje = hojeLisboa();
  const futuras = linhas.filter((l) => (l.data ?? l.startdatetime.slice(0, 10)) >= hoje);
  const minhas = cps.length ? futuras.filter((l) => cps.some((cp) => l.zipcode.replace(/\s/g, "").startsWith(cp))) : [];
  // Agrupar por interrupção (mesmo início, fim e freguesia)
  const grupos = new Map<string, LinhaEredes[]>();
  for (const l of minhas) {
    const k = `${l.startdatetime}|${l.enddatetime}|${l.parish}`;
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  const hora = (s: string) => s.slice(11, 16);
  const itens: Item[] = [...grupos.entries()].map(([k, ls]) => {
    const l = ls[0];
    const quando = `${dia(l.startdatetime)}, ${hora(l.startdatetime)}–${hora(l.enddatetime)}`;
    return {
      hash: k,
      titulo: `Corte de luz · ${quando}`,
      url: "https://www.e-redes.pt/pt-pt/o-que-fazemos/qualidade-de-servico/consulte-interrupcoes-agendadas",
      resumo: `${l.parish} · CP ${[...new Set(ls.map((x) => x.zipcode))].join(", ")}`,
      dados: { inicio: l.startdatetime, fim: l.enddatetime, freguesia: l.parish, codigos_postais: ls.map((x) => x.zipcode) },
      alerta: { tipo: "luz", titulo: `Corte de luz: ${quando}`, mensagem: `${l.parish}. O filtro e o aquecedor vão parar.` },
    };
  });
  return {
    itens,
    resultado: {
      concelho,
      agendadas_no_concelho: new Set(futuras.map((l) => `${l.startdatetime}|${l.parish}`)).size,
      afetam_os_meus_cp: itens.length,
      sem_codigo_postal: cps.length === 0,
    },
  };
}

// ---------------------------------------------------------------------
// 3) Cortes de água — AGERE (secção "Avisos e Informações")
// ---------------------------------------------------------------------
export function lerAvisosAgere(html: string) {
  const blocos = [...html.matchAll(/<td class="column-1">([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  return blocos
    .map((b) => {
      const titulo = semHtml(b.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? "");
      const publicado = semHtml(b.match(/Publicado a ([^<]+)/)?.[1] ?? "");
      const texto = semHtml(b);
      const d = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const hora = texto.match(/(\d{1,2}h\d{0,2})/)?.[1] ?? null;
      const freguesias = titulo.split(" - ").slice(1).join(" - ") || null;
      return { titulo, publicado, data: d ? `${d[3]}-${d[2]}-${d[1]}` : null, hora, freguesias, texto };
    })
    .filter((a) => a.titulo);
}

export async function agereAvisos(cfg: Cfg, url = "https://www.agere.pt/avisos/"): Promise<Saida> {
  const termos = ((cfg.termos as string[]) ?? []).map(normalizar).filter(Boolean);
  const r = await obter(url);
  if (!r.ok) throw new Error(`AGERE: HTTP ${r.status}`);
  const avisos = lerAvisosAgere(await r.text());
  if (!avisos.length) throw new Error("AGERE: não encontrei avisos (o site mudou?)");
  const hoje = hojeLisboa();
  const meus = termos.length ? avisos.filter((a) => termos.some((t) => normalizar(a.texto).includes(t))) : [];
  const itens: Item[] = meus
    .filter((a) => !a.data || a.data >= hoje)
    .map((a) => {
      const quando = a.data ? dia(a.data) : "data por confirmar";
      return {
        hash: normalizar(`${a.titulo}|${a.publicado}`),
        titulo: `Corte de água · ${quando}${a.hora ? ` (${a.hora})` : ""}`,
        url,
        resumo: a.freguesias,
        dados: a,
        alerta: {
          tipo: "agua",
          titulo: `Corte de água: ${quando}${a.hora ? `, a partir das ${a.hora}` : ""}`,
          mensagem: `${a.freguesias ?? "Na tua zona"}. Não faças TPA nesse período.`,
        },
      };
    });
  return {
    itens,
    resultado: {
      ultimos: avisos.slice(0, 5).map(({ titulo, publicado, data, hora }) => ({ titulo, publicado, data, hora })),
      correspondem: meus.length,
      sem_termos: termos.length === 0,
    },
  };
}

// ---------------------------------------------------------------------
// 4) Qualidade da água — AGERE (relatório trimestral, rede de distribuição)
// ---------------------------------------------------------------------
export function lerRelatorioAgere(texto: string) {
  const t = texto.replace(/\s+/g, " ");
  const n = (s: string) => Number(s.replace("<", "").replace(",", "."));
  const par = (re: RegExp) => {
    const m = t.match(re);
    return m ? { min: n(m[1]), max: n(m[2]) } : null;
  };
  const dureza = par(/Dureza total\s+-+\s+mg\/l CaCO3\s+(<?[\d,]+)\s+(<?[\d,]+)/i);
  return {
    trimestre: t.match(/(\d)\s*º\s*TRIMESTRE/i)?.[1] ?? null,
    ano: t.match(/CONCELHO DE BRAGA\s+(\d{4})/i)?.[1] ?? null,
    cloro_mg_l: par(/Desinfetante residual\s+-+\s+mg\/l\s+(<?[\d,]+)\s+(<?[\d,]+)/i),
    ph: par(/\bpH\s+≥?\s*6,5 e ≤\s*9,5\s+Unidades pH\s+(<?[\d,]+)\s+(<?[\d,]+)/i),
    dureza_mg_caco3: dureza,
    // 1 °dGH = 17,848 mg/L de CaCO3
    dureza_dgh: dureza ? { min: Math.round((dureza.min / 17.848) * 10) / 10, max: Math.round((dureza.max / 17.848) * 10) / 10 } : null,
    condutividade_us_cm: par(/Condutividade\s+\d+\s+μS\/cm a 20 ºC\s+(<?[\d,]+)\s+(<?[\d,]+)/i),
  };
}

export async function agereQualidade(_cfg: Cfg, anterior: { url?: string } | null, url = "https://agere.pt/agua-de-consumo/"): Promise<Saida> {
  const r = await obter(url);
  if (!r.ok) throw new Error(`AGERE: HTTP ${r.status}`);
  const html = await r.text();
  // O primeiro PDF "Baixa" (rede de distribuição = água da torneira) é o mais recente
  const links = [...html.matchAll(/href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ url: m[1], texto: semHtml(m[2]) }));
  const pdf = links.find((l) => /baixa/i.test(l.texto) || /baixa/i.test(l.url));
  if (!pdf) throw new Error("AGERE: não encontrei o relatório (o site mudou?)");
  if (anterior?.url === pdf.url) return { itens: [] }; // nada de novo
  const pr = await obter(pdf.url);
  if (!pr.ok) throw new Error(`AGERE PDF: HTTP ${pr.status}`);
  const { extractText, getDocumentProxy } = await import("npm:unpdf@1");
  const doc = await getDocumentProxy(new Uint8Array(await pr.arrayBuffer()));
  const { text } = await extractText(doc, { mergePages: true });
  const v = lerRelatorioAgere(text as string);
  const f = (p: { min: number; max: number } | null, u: string, d = 2) =>
    p ? (p.min === p.max ? `${num(p.min, d)} ${u}` : `${num(p.min, d)}–${num(p.max, d)} ${u}`) : null;
  const resumo = [
    v.dureza_mg_caco3 && `Dureza ${f(v.dureza_mg_caco3, "mg/L CaCO₃")} (≈ ${num(v.dureza_dgh!.max)} °dGH)`,
    v.ph && `pH ${f(v.ph, "")}`.trim(),
    v.cloro_mg_l && `cloro ${f(v.cloro_mg_l, "mg/L")}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const titulo = `Qualidade da água: ${v.trimestre ? `${v.trimestre}.º trimestre ` : ""}${v.ano ?? ""}`.trim();
  return {
    itens: [
      {
        hash: pdf.url,
        titulo,
        url: pdf.url,
        resumo,
        dados: v,
        // 1.ª verificação = linha de base, sem alerta
        alerta: anterior ? { tipo: "qualidade", titulo: "Novo relatório da qualidade da água", mensagem: resumo } : null,
      },
    ],
    resultado: { ...v, url: pdf.url, rotulo: pdf.texto },
    estado: { url: pdf.url },
  };
}

// ---------------------------------------------------------------------
// 5) Lojas: produtos novos, regresso de stock e mudanças de preço
// ---------------------------------------------------------------------
type Produto = { nome: string; preco: number | null; stock: boolean | null; url: string | null };
type EstadoLoja = { produtos: Record<string, Produto> };

async function lojaWoo(base: string, palavras: string[]): Promise<Record<string, Produto>> {
  const out: Record<string, Produto> = {};
  for (const p of palavras) {
    const r = await obter(`${base}/wp-json/wc/store/v1/products?search=${encodeURIComponent(p)}&per_page=100`, { headers: { Accept: "application/json" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error(`Store API indisponível (HTTP ${r.status})`);
    for (const x of (await r.json()) as Record<string, any>[]) {
      const minor = Number(x.prices?.currency_minor_unit ?? 2);
      out[String(x.id)] = {
        nome: semHtml(String(x.name)),
        preco: x.prices?.price ? Number(x.prices.price) / 10 ** minor : null,
        stock: Boolean(x.is_in_stock),
        url: x.permalink ?? null,
      };
    }
  }
  return out;
}

/** Plano B (WordPress): sitemap de produtos → só deteta produtos novos. */
async function lojaSitemap(base: string, palavras: string[]): Promise<Record<string, Produto>> {
  const out: Record<string, Produto> = {};
  const ps = palavras.map((p) => normalizar(p).replace(/\s+/g, "-"));
  for (const sm of ["/wp-sitemap-posts-product-1.xml", "/product-sitemap.xml"]) {
    const r = await obter(base + sm).catch(() => null);
    if (!r?.ok) continue;
    for (const [, loc] of (await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const slug = loc.replace(/\/$/, "").split("/").pop() ?? "";
      if (ps.some((p) => slug.includes(p))) out[loc] = { nome: slug.replace(/-/g, " "), preco: null, stock: null, url: loc };
    }
    if (Object.keys(out).length) break;
  }
  return out;
}

/** Loja genérica: URL + seletores CSS (configuráveis nas definições). */
async function lojaHtml(cfg: Cfg, palavras: string[]): Promise<Record<string, Produto>> {
  const { DOMParser } = await import("jsr:@b-fuze/deno-dom@0.1.56");
  const r = await obter(String(cfg.url_listagem ?? cfg.url));
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const doc = new DOMParser().parseFromString(await r.text(), "text/html");
  if (!doc) throw new Error("HTML inválido");
  const out: Record<string, Produto> = {};
  const ps = palavras.map(normalizar);
  for (const el of doc.querySelectorAll(String(cfg.seletor_item ?? "li.product"))) {
    // deno-dom: el é um Node; quem tem querySelector é o Element
    const e = el as unknown as { textContent: string | null; querySelector(s: string): { textContent: string | null; getAttribute(n: string): string | null } | null };
    const nome = (cfg.seletor_nome ? e.querySelector(String(cfg.seletor_nome))?.textContent : e.textContent)?.trim() ?? "";
    if (!nome || (ps.length && !ps.some((p) => normalizar(nome).includes(p)))) continue;
    const precoTxt = cfg.seletor_preco ? e.querySelector(String(cfg.seletor_preco))?.textContent ?? "" : "";
    const m = precoTxt.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
    const href = (cfg.seletor_link ? e.querySelector(String(cfg.seletor_link)) : e.querySelector("a"))?.getAttribute("href") ?? null;
    const url = href ? new URL(href, String(cfg.url_listagem ?? cfg.url)).href : null;
    out[url ?? nome] = { nome, preco: m ? Number(m[1].replace(",", ".")) : null, stock: null, url };
  }
  return out;
}

export async function loja(cfg: Cfg, nome: string, base: string, anterior: EstadoLoja | null): Promise<Saida> {
  const palavras = ((cfg.palavras as string[]) ?? []).filter(Boolean);
  const plataforma = String(cfg.plataforma ?? "woocommerce");
  if (plataforma === "nenhuma") return { itens: [], resultado: { nota: cfg.nota ?? "Sem loja online." } };
  let produtos: Record<string, Produto>;
  let via = plataforma;
  if (plataforma === "woocommerce") {
    try {
      produtos = await lojaWoo(base.replace(/\/$/, ""), palavras);
    } catch {
      produtos = await lojaSitemap(base.replace(/\/$/, ""), palavras);
      via = "sitemap";
    }
  } else produtos = await lojaHtml({ ...cfg, url: base }, palavras);

  const itens: Item[] = [];
  const antes = anterior?.produtos;
  const hoje = hojeLisboa();
  const preco = (p: number | null) => (p == null ? "" : ` — ${num(p, 2)} €`);
  if (antes) {
    for (const [k, p] of Object.entries(produtos)) {
      const a = antes[k];
      if (!a) {
        itens.push({ hash: `novo:${k}`, titulo: `Novo: ${p.nome}${preco(p.preco)}`, url: p.url, dados: p, alerta: { tipo: "loja", titulo: `${nome}: produto novo`, mensagem: `${p.nome}${preco(p.preco)}` } });
      } else {
        if (a.stock === false && p.stock === true)
          itens.push({ hash: `stock:${k}:${hoje}`, titulo: `De volta ao stock: ${p.nome}${preco(p.preco)}`, url: p.url, dados: p, alerta: { tipo: "loja", titulo: `${nome}: de volta ao stock`, mensagem: `${p.nome}${preco(p.preco)}` } });
        if (a.preco != null && p.preco != null && a.preco !== p.preco)
          itens.push({
            hash: `preco:${k}:${p.preco}`,
            titulo: `Preço: ${p.nome} ${num(a.preco, 2)} → ${num(p.preco, 2)} €`,
            url: p.url,
            dados: { ...p, preco_anterior: a.preco },
            alerta: { tipo: "loja", titulo: `${nome}: ${p.preco < a.preco ? "baixou de preço" : "mudou de preço"}`, mensagem: `${p.nome}: ${num(a.preco, 2)} → ${num(p.preco, 2)} €` },
          });
      }
    }
  }
  const lista = Object.values(produtos);
  return {
    itens,
    resultado: { via, total: lista.length, em_stock: lista.filter((p) => p.stock).length, palavras, linha_de_base: !antes },
    estado: { produtos },
  };
}
