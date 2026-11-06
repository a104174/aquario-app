import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { criarDados, type Cenario } from "./dados";

export const SUPABASE = "https://mock.supabase.co";
const ASSETS = path.join(__dirname, "assets");

type Rede = "ok" | "lento" | "erro";
type Opcoes = { safeTop: number; safeBottom: number; cenario: Cenario; rede: Rede; sessao: boolean };

export function pastaReview() {
  const dia = new Date().toISOString().slice(0, 10);
  return path.join("reviews", dia, process.env.CICLO ?? "ciclo-0");
}

/** Init script: standalone, safe areas, visualViewport controlável (teclado iOS), sessão. */
function scriptInicial(o: { safeTop: number; safeBottom: number; sessao: boolean }) {
  // Sessão (o supabase-js lê-a do localStorage)
  if (o.sessao)
    localStorage.setItem(
      "aquario-auth",
      JSON.stringify({ access_token: "t", refresh_token: "r", expires_at: 9999999999, expires_in: 3600, token_type: "bearer", user: { id: "u1", email: "eu@exemplo.pt" } }),
    );
  // display-mode: standalone
  Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q: string) =>
    q.includes("display-mode: standalone")
      ? ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } as unknown as MediaQueryList)
      : mm(q);
  // Safe areas (env() não é emulável): sobrepõe as variáveis
  const aplicar = () => {
    const s = document.createElement("style");
    s.dataset.teste = "safe";
    s.textContent = `:root{--safe-top:${o.safeTop}px !important;--safe-bottom:${o.safeBottom}px !important}`;
    document.head.appendChild(s);
  };
  if (document.head) aplicar();
  else document.addEventListener("DOMContentLoaded", aplicar);
  // visualViewport controlável (teclado à iOS: só a área visível encolhe)
  const real = window.visualViewport;
  const ouvintes: Record<string, Set<EventListener>> = { resize: new Set(), scroll: new Set() };
  let reducao = 0;
  const vv = {
    get width() { return real?.width ?? innerWidth; },
    get height() { return (real?.height ?? innerHeight) - reducao; },
    get offsetTop() { return 0; },
    get offsetLeft() { return 0; },
    get pageTop() { return scrollY; },
    get pageLeft() { return scrollX; },
    get scale() { return 1; },
    onresize: null, onscroll: null,
    addEventListener(t: string, f: EventListener) { ouvintes[t]?.add(f); real?.addEventListener(t, f); },
    removeEventListener(t: string, f: EventListener) { ouvintes[t]?.delete(f); real?.removeEventListener(t, f); },
    dispatchEvent() { return true; },
  };
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
  (window as unknown as { __tecladoIOS: (px: number) => void }).__tecladoIOS = (px: number) => {
    reducao = px;
    for (const t of ["resize", "scroll"]) ouvintes[t].forEach((f) => f(new Event(t)));
  };
}

export const test = base.extend<Opcoes & { app: Page; erros: string[] }>({
  safeTop: [0, { option: true }],
  safeBottom: [0, { option: true }],
  cenario: ["cheio", { option: true }],
  rede: ["ok", { option: true }],
  sessao: [true, { option: true }],

  erros: async ({}, use) => {
    await use([]);
  },

  app: async ({ page, safeTop, safeBottom, cenario, rede, sessao, erros }, use, testInfo) => {
    page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // erros de rede esperados no cenário "erro"/offline não contam
      if (rede === "erro" && /500|Failed to load resource|fetch/i.test(t)) return;
      if (/Failed to load resource: (net::ERR_INTERNET_DISCONNECTED|.*offline)/i.test(t)) return;
      erros.push(`console: ${t}`);
    });
    await page.addInitScript(scriptInicial, { safeTop, safeBottom, sessao });
    const db = criarDados(cenario) as Record<string, Record<string, unknown>[]>;
    await page.route(`${SUPABASE}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const p = url.pathname;
      if (p.startsWith("/auth/v1/")) {
        if (p.endsWith("/otp")) return route.fulfill({ status: 200, json: {} });
        if (p.endsWith("/verify")) {
          const body = JSON.parse(req.postData() || "{}");
          if (body.token !== "123456") return route.fulfill({ status: 403, json: { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" } });
          return route.fulfill({ status: 200, json: { access_token: "t", refresh_token: "r", expires_in: 3600, expires_at: 9999999999, token_type: "bearer", user: { id: "u1", email: "eu@exemplo.pt" } } });
        }
        return route.fulfill({ status: 200, json: { id: "u1", email: "eu@exemplo.pt" } });
      }
      if (p.startsWith("/storage/v1/object/sign/")) {
        if (req.method() === "POST") return route.fulfill({ status: 200, json: { signedURL: p.replace("/storage/v1", "") + "?token=t" } });
        const n = (p.length % 3) + 1;
        return route.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(path.join(ASSETS, `fixture${n}.jpg`)) });
      }
      if (p.startsWith("/storage/v1/")) return route.fulfill({ status: 200, json: { Key: "x" } });
      if (p.startsWith("/functions/v1/")) return route.fulfill({ status: 200, json: { enviados: 1, fontes: [] } });
      const tabela = p.split("/rest/v1/")[1];
      if (!tabela) return route.fulfill({ status: 404, json: {} });
      if (tabela.startsWith("rpc/")) return route.fulfill({ status: 200, json: db.aquarios });
      if (req.method() === "GET") {
        if (rede === "erro") return route.fulfill({ status: 500, json: { message: "erro simulado" } });
        if (rede === "lento") await new Promise((r) => setTimeout(r, 4000));
        const linhas = db[tabela] ?? [];
        const objeto = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
        return route.fulfill({ status: 200, json: objeto ? (linhas[0] ?? null) : linhas });
      }
      if (req.method() === "POST") {
        const corpo = [].concat(JSON.parse(req.postData() || "[]")) as Record<string, unknown>[];
        const lista = (db[tabela] ||= []);
        for (const r of corpo) {
          const i = lista.findIndex((x) => x.id === r.id);
          if (i >= 0) lista[i] = { ...lista[i], ...r };
          else lista.unshift(r);
        }
        return route.fulfill({ status: 201, json: [] });
      }
      if (req.method() === "DELETE") {
        const id = url.searchParams.get("id")?.replace("eq.", "");
        db[tabela] = (db[tabela] ?? []).filter((x) => x.id !== id);
        return route.fulfill({ status: 200, json: [] });
      }
      return route.fulfill({ status: 200, json: [] });
    });
    await use(page);
    testInfo.annotations.push({ type: "erros", description: erros.join("\n") });
  },
});

export { expect };

/** Escreve um achado (para a contact sheet e para a crítica do ciclo). */
export function achado(testInfo: TestInfo, tipo: string, texto: string) {
  const f = path.join(pastaReview(), "achados.jsonl");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, JSON.stringify({ projeto: testInfo.project.name, teste: testInfo.title, tipo, texto }) + "\n");
}

/** Captura com moldura do iPhone (status bar, Dynamic Island, home indicator). */
export async function captura(page: Page, testInfo: TestInfo, nome: string, opts: { teclado?: number } = {}) {
  const { safeTop, safeBottom } = testInfo.project.use as unknown as Opcoes;
  await page.evaluate(
    ({ safeTop, safeBottom, teclado }) => {
      const m = document.createElement("div");
      m.id = "__moldura";
      m.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;font:600 15px -apple-system,system-ui,sans-serif";
      const ilha = safeTop >= 47 ? `<div style="position:absolute;top:11px;left:50%;width:124px;height:36px;margin-left:-62px;border-radius:20px;background:#000"></div>` : "";
      const barra = safeTop > 0 ? `<div style="position:absolute;top:${safeTop >= 47 ? 17 : 3}px;left:${safeTop >= 47 ? 34 : 12}px;color:#fff;mix-blend-mode:difference">9:41</div>` : "";
      const home = safeBottom > 0 ? `<div style="position:absolute;bottom:8px;left:50%;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:#000;opacity:.85;mix-blend-mode:difference;filter:invert(1)"></div>` : "";
      const kb = teclado ? `<div style="position:absolute;left:0;right:0;bottom:0;height:${teclado}px;background:#cfd3d9;border-top:1px solid #aab;display:flex;align-items:flex-start;justify-content:center;padding-top:14px;color:#555;font-weight:500">teclado (${teclado}px)</div>` : "";
      m.innerHTML = ilha + barra + home + kb;
      document.body.appendChild(m);
    },
    { safeTop, safeBottom, teclado: opts.teclado ?? 0 },
  );
  const f = path.join(pastaReview(), testInfo.project.name, `${nome}.jpg`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  await page.screenshot({ path: f, type: "jpeg", quality: 70 });
  await page.evaluate(() => document.getElementById("__moldura")?.remove());
  return f;
}

/** Espera que as animações de entrada assentem. */
export async function assentar(page: Page, ms = 700) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

/** Abre/fecha o teclado simulado. Devolve a altura do teclado. */
export async function teclado(page: Page, testInfo: TestInfo, abrir: boolean) {
  const vp = page.viewportSize()!;
  const ios = testInfo.project.use.browserName === "webkit";
  const h = (testInfo.project.use.viewport as { height: number }).height;
  const kb = Math.round(h * 0.4);
  if (ios) {
    await page.evaluate((px) => (window as unknown as { __tecladoIOS: (n: number) => void }).__tecladoIOS(px), abrir ? kb : 0);
  } else {
    await page.setViewportSize({ width: vp.width, height: abrir ? h - kb : h });
  }
  await page.waitForTimeout(450);
  return { kb, ios, alturaVisivel: h - (abrir ? kb : 0) };
}

/** Verificações comuns de layout a qualquer ecrã. */
export async function verificarLayout(page: Page, testInfo: TestInfo, ecra: string) {
  const r = await page.evaluate(() => {
    const vis = (e: Element) => {
      const b = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05 && b.bottom > 0 && b.top < innerHeight;
    };
    const transbordo = [...document.querySelectorAll<HTMLElement>("body, .scroll-area, main")].filter((e) => {
      const ox = getComputedStyle(e).overflowX;
      return e.scrollWidth > e.clientWidth + 1 && ox !== "auto" && ox !== "scroll";
    }).map((e) => `${e.tagName}.${e.className.toString().slice(0, 40)} ${e.scrollWidth}>${e.clientWidth}`);
    const largos = [...document.querySelectorAll("body *")].filter((e) => {
      const b = e.getBoundingClientRect();
      if (!vis(e) || b.right <= innerWidth + 1) return false;
      // ignora o que está dentro de contentores com scroll horizontal intencional
      for (let p = e.parentElement; p; p = p.parentElement) if (["auto", "scroll", "hidden"].includes(getComputedStyle(p).overflowX)) return false;
      return true;
    }).slice(0, 5).map((e) => `${e.tagName}.${(e as HTMLElement).className.toString().slice(0, 40)}`);
    const inputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=file]), textarea, select")].filter(vis)
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => (e as HTMLInputElement).name || e.id || e.outerHTML.slice(0, 60));
    // Com uma sheet/diálogo aberto, o fundo está inerte (e escalado pelo vaul): só conta o que está à frente
    const frente = document.querySelector("[data-vaul-drawer]") ?? document.querySelector('[role="dialog"]') ?? document;
    const pequenos = [...frente.querySelectorAll("button, a[href], [role=button], [role=tab], [role=switch], [role=checkbox], input[type=checkbox]")].filter(vis)
      .map((e) => ({ e, b: e.getBoundingClientRect() }))
      .filter(({ b }) => b.width < 44 || b.height < 44)
      .map(({ e, b }) => `${Math.round(b.width)}×${Math.round(b.height)} ${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30)}`);
    return { transbordo, largos, inputs, pequenos };
  });
  expect.soft(r.transbordo, `${ecra}: scroll horizontal acidental`).toEqual([]);
  expect.soft(r.largos, `${ecra}: elementos fora do ecrã`).toEqual([]);
  expect.soft(r.inputs, `${ecra}: inputs < 16px (zoom no iOS)`).toEqual([]);
  for (const p of r.pequenos) achado(testInfo, "alvo<44", `${ecra}: ${p}`);
  return r;
}
