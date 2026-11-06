import type { Page, TestInfo } from "@playwright/test";
import { assentar, captura, expect, test } from "./fixtures";

/**
 * Teclado em TODAS as sheets e formulários (iPhone 16 Pro Max e SE, WebKit).
 * Simula o iOS a sério: o visualViewport encolhe ~40% E é deslocado
 * (offsetTop) para mostrar o campo, como o Safari faz ao focar. Para cada
 * campo verifica que o campo e o botão de guardar ficam na zona visível.
 */
test.beforeEach(({}, info) => test.skip(!["iphone-16-pro-max", "iphone-se"].includes(info.project.name)));

type Abrir = (p: Page) => Promise<void>;

async function registar(p: Page, rotulo: string) {
  await p.goto("/aquario?id=a1");
  await assentar(p);
  await p.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(p, 700);
  await p.getByRole("button", { name: new RegExp(`^${rotulo}`) }).click();
  await assentar(p, 700);
}
async function headerMais(p: Page, url: string, label: string) {
  await p.goto(url);
  await assentar(p);
  await p.getByRole("button", { name: label }).click();
  await assentar(p, 800);
}

const SHEETS: [string, Abrir][] = [
  ["tpa", (p) => registar(p, "TPA")],
  ["medicao", (p) => registar(p, "Medição")],
  ["fauna", (p) => registar(p, "Fauna")],
  ["foto", (p) => registar(p, "Foto")],
  ["ninhada", (p) => registar(p, "Ninhada")],
  [
    "detalhar-grupo",
    async (p) => {
      await p.goto("/aquario?id=a1");
      await assentar(p);
      await p.getByRole("tab", { name: "Fauna" }).click();
      await assentar(p, 500);
      await p.getByRole("button", { name: /^Neon/ }).first().click();
      await assentar(p, 600);
      await p.getByRole("button", { name: "Detalhar animais deste grupo" }).click();
      await assentar(p, 900);
    },
  ],
  ["novo-aquario", (p) => headerMais(p, "/aquarios", "Novo aquário")],
  ["produto", (p) => headerMais(p, "/produtos", "Novo produto")],
  ["desejo", (p) => headerMais(p, "/desejos", "Novo desejo")],
  ["ferias", (p) => headerMais(p, "/ferias", "Planear férias")],
  ["loja", (p) => headerMais(p, "/fontes", "Adicionar loja")],
];

/** Campos com teclado, pela ordem do DOM (= ordem das setas ↑/↓ do iOS). */
function campos(p: Page, raiz: string) {
  return p.evaluate((raiz) => {
    const SEM = new Set(["date", "datetime-local", "time", "file", "checkbox", "radio", "range", "color", "hidden", "button", "submit"]);
    const r = document.querySelector(raiz) ?? document.body;
    return [...r.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")]
      .filter((e) => !(e instanceof HTMLInputElement && SEM.has(e.type)) && !e.disabled && !e.readOnly && e.getClientRects().length > 0)
      .map((e, i) => {
        e.dataset.tecladoTeste = String(i);
        return { i, id: e.id || e.getAttribute("placeholder") || e.tagName, fonte: parseFloat(getComputedStyle(e).fontSize) };
      });
  }, raiz);
}

async function verificar(p: Page, info: TestInfo, nome: string, raiz: string) {
  const vp = p.viewportSize()!;
  const kb = Math.round(vp.height * 0.4);
  const lista = await campos(p, raiz);
  expect(lista.length, `${nome}: sem campos`).toBeGreaterThan(0);
  for (const c of lista.slice(0, 8)) {
    const el = p.locator(`[data-teclado-teste="${c.i}"]`);
    expect.soft(c.fonte, `${nome}/${c.id}: font-size < 16px (o iOS faz zoom)`).toBeGreaterThanOrEqual(16);
    await el.click();
    // o iOS desloca o viewport o suficiente para o campo ficar acima do teclado
    const pan = await el.evaluate((e, kb) => {
      const r = e.getBoundingClientRect();
      return Math.max(0, Math.min(kb, Math.round(r.bottom + 40 - (innerHeight - kb))));
    }, kb);
    await p.evaluate(([kb, pan]) => (window as unknown as { __tecladoIOS: (a: number, b: number) => void }).__tecladoIOS(kb, pan), [kb, pan]);
    await p.waitForTimeout(750);
    if (c.i === 0) {
      // captura sem deslocamento (a imagem é do layout, não do viewport visual)
      await p.evaluate((kb) => (window as unknown as { __tecladoIOS: (a: number, b: number) => void }).__tecladoIOS(kb, 0), kb);
      await p.waitForTimeout(600);
      await captura(p, info, `teclado-${nome}`, { teclado: kb });
      await p.evaluate(([kb, pan]) => (window as unknown as { __tecladoIOS: (a: number, b: number) => void }).__tecladoIOS(kb, pan), [kb, pan]);
      await p.waitForTimeout(600);
    }
    const r = await p.evaluate((raiz) => {
      const vv = window.visualViewport!;
      const topo = vv.offsetTop;
      const fundo = vv.offsetTop + vv.height;
      const f = document.activeElement as HTMLElement | null;
      const fr = f?.getBoundingClientRect();
      const g = [...document.querySelectorAll<HTMLButtonElement>(`${raiz} .rodape-sheet button`)].pop()?.getBoundingClientRect();
      const nav = document.querySelector(".tabbar-capsula");
      const ns = nav ? getComputedStyle(nav.parentElement!) : null;
      return {
        foco: f?.tagName,
        campo: fr ? { top: fr.top, bottom: fr.bottom } : null,
        guardar: g ? { top: g.top, bottom: g.bottom } : null,
        topo,
        fundo,
        navVisivel: !!ns && Number(ns.opacity) > 0.1 && ns.pointerEvents !== "none",
      };
    }, raiz);
    expect.soft(r.foco, `${nome}/${c.id}: perdeu o foco`).toMatch(/INPUT|TEXTAREA/);
    expect.soft(r.campo && r.campo.top >= r.topo - 1 && r.campo.bottom <= r.fundo + 1, `${nome}/${c.id}: campo fora da zona visível ${JSON.stringify(r)}`).toBe(true);
    if (r.guardar) expect.soft(r.guardar.top >= r.topo - 1 && r.guardar.bottom <= r.fundo + 1, `${nome}/${c.id}: Guardar fora da zona visível ${JSON.stringify(r)}`).toBe(true);
    expect.soft(r.navVisivel, `${nome}: navegação visível com o teclado aberto`).toBe(false);
    // fechar o teclado: tudo volta ao lugar
    await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await p.evaluate(() => (window as unknown as { __tecladoIOS: (a: number, b: number) => void }).__tecladoIOS(0, 0));
    await p.waitForTimeout(450);
  }
  const depois = await p.evaluate(() => ({
    teclado: document.documentElement.dataset.teclado ?? null,
    fundoGaveta: document.querySelector("[data-vaul-drawer]")?.getBoundingClientRect().bottom ?? null,
    h: innerHeight,
    scrollY,
  }));
  expect.soft(depois.teclado, `${nome}: estado do teclado preso`).toBeNull();
  if (depois.fundoGaveta !== null) expect.soft(Math.abs(depois.fundoGaveta - depois.h), `${nome}: sheet não voltou ao fundo`).toBeLessThan(2);
  expect.soft(depois.scrollY, `${nome}: scroll da página preso`).toBe(0);
}

for (const [nome, abrir] of SHEETS) {
  test(`teclado na sheet: ${nome}`, async ({ app, erros }, info) => {
    await abrir(app);
    await expect(app.locator("[data-vaul-drawer]")).toBeVisible();
    await verificar(app, info, nome, "[data-vaul-drawer]");
    expect(erros).toEqual([]);
  });
}

test("teclado: férias (adicionar item, sem sheet)", async ({ app }, info) => {
  await app.goto("/ferias");
  await assentar(app);
  await verificar(app, info, "ferias-checklist", "main");
});

test.describe("login", () => {
  test.use({ sessao: false });
  test("teclado: login (email)", async ({ app }, info) => {
    await app.goto("/login");
    await assentar(app);
    await verificar(app, info, "login", "body");
  });
});

test("Enter no último campo guarda; nos intermédios avança", async ({ app }) => {
  await registar(app, "Medição");
  await app.locator("#med-nh3_nh4").click();
  expect(await app.locator("#med-nh3_nh4").getAttribute("enterkeyhint")).toBe("next");
  await app.keyboard.press("Enter");
  await expect(app.locator("#med-no2")).toBeFocused();
  // TPA: o último campo de texto recebe "OK"; Enter nele guarda e fecha a sheet
  await app.keyboard.press("Escape");
  await registar(app, "TPA");
  await app.locator("#tpa-litros").fill("5");
  const ultimo = await app.evaluate(() => {
    const l = [...document.querySelectorAll<HTMLInputElement>("[data-vaul-drawer] form input")].filter(
      (e) => !["date", "datetime-local", "time", "file", "checkbox", "radio", "hidden"].includes(e.type) && e.getClientRects().length > 0,
    );
    const u = l[l.length - 1];
    u.dataset.ultimo = "1";
    return u.id;
  });
  const campo = app.locator("[data-ultimo]");
  await campo.click();
  // (se o último campo de texto for seguido de uma área de notas, avança para ela)
  const dica = await campo.getAttribute("enterkeyhint");
  await app.keyboard.press("Enter");
  if (dica === "done") await expect(app.locator("[data-vaul-drawer]")).toBeHidden({ timeout: 4000 });
  else expect.soft(dica, `último campo (${ultimo}) devia ter enterkeyhint next/done`).toBe("next");
});
