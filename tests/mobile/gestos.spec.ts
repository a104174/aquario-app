import fs from "node:fs";
import path from "node:path";
import { assentar, captura, expect, pastaReview, test } from "./fixtures";
import { gesto, linha } from "./toque";

// Vídeo das transições, sheets e gestos (só iPhone 15 e Pixel 7)
test.use({ video: { mode: "on", size: { width: 393, height: 852 } } });
test.beforeEach(({}, info) => test.skip(!["iphone-15", "pixel-7"].includes(info.project.name)));
test.afterEach(async ({ page }, info) => {
  const v = page.video();
  if (!v) return;
  await page.close();
  const destino = path.join(pastaReview(), info.project.name, "videos", `${info.title.replace(/[^\w-]+/g, "-")}.webm`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await v.saveAs(destino).catch(() => {});
});

test("transições: aquários → detalhe → voltar", async ({ app }, info) => {
  await app.goto("/aquarios");
  await assentar(app);
  await app.getByRole("link", { name: /^Abrir Principal/ }).click({ position: { x: 140, y: 34 } });
  await app.waitForURL(/aquario/);
  await assentar(app, 900);
  await app.getByRole("button", { name: /Aquários/ }).first().click();
  await app.waitForURL((u) => u.pathname === "/aquarios");
  await assentar(app, 900);
  await captura(app, info, "transicao-voltar");
});

test("swipe a partir da borda esquerda volta atrás", async ({ app }) => {
  await app.goto("/aquario?id=a1");
  await assentar(app);
  await gesto(app, [linha({ x: 4, y: 420 }, { x: 300, y: 430 }, 16)]);
  // espera pela navegação (animação de saída + transição), não um tempo fixo
  await app.waitForURL((u) => u.pathname === "/aquarios", { timeout: 4000 }).catch(() => {});
  expect.soft(new URL(app.url()).pathname, "swipe da borda não voltou atrás").toBe("/aquarios");
});

test("sheet: arrastar para baixo fecha", async ({ app }, info) => {
  await app.goto("/");
  await assentar(app);
  await app.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(app, 800);
  await captura(app, info, "sheet-aberta");
  const handle = await app.locator("[data-vaul-handle]").boundingBox();
  const x = handle!.x + handle!.width / 2;
  await app.mouse.move(x, handle!.y + 2);
  await app.mouse.down();
  for (let i = 1; i <= 12; i++) await app.mouse.move(x, handle!.y + 2 + i * 35, { steps: 1 });
  await app.mouse.up();
  await app.waitForTimeout(900);
  await expect.soft(app.locator("[data-vaul-drawer]"), "a sheet não fechou ao arrastar").toHaveCount(0);
});

test("sheet: tocar no fundo fecha", async ({ app }) => {
  await app.goto("/");
  await assentar(app);
  await app.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(app, 800);
  await app.touchscreen.tap(200, 60);
  await app.waitForTimeout(900);
  await expect.soft(app.locator("[data-vaul-drawer]")).toHaveCount(0);
});

test("visualizador: duplo toque, pinça, swipe e fechar", async ({ app }, info) => {
  await app.goto("/aquario?id=a1");
  await assentar(app);
  await app.getByRole("tab", { name: "Fotos" }).click();
  await assentar(app);
  await app.getByRole("button", { name: "Abrir foto" }).first().click();
  await assentar(app, 900);
  const escala = () =>
    app.evaluate(() => {
      const slide = document.querySelector('[role="dialog"] [data-atual="true"]') as HTMLElement | null;
      const t = slide ? getComputedStyle(slide).transform : "none";
      return t === "none" ? 1 : new DOMMatrix(t).a;
    });
  // duplo toque
  await app.touchscreen.tap(196, 430);
  await app.waitForTimeout(80);
  await app.touchscreen.tap(196, 430);
  await app.waitForTimeout(500);
  expect.soft(await escala(), "duplo toque não fez zoom").toBeGreaterThan(1.5);
  await captura(app, info, "visualizador-zoom");
  await app.touchscreen.tap(196, 430);
  await app.waitForTimeout(80);
  await app.touchscreen.tap(196, 430);
  await app.waitForTimeout(500);
  // pinça (2 dedos a afastar)
  await gesto(app, [linha({ x: 170, y: 430 }, { x: 90, y: 430 }), linha({ x: 220, y: 430 }, { x: 300, y: 430 })], { alvo: '[role="dialog"]' });
  await app.waitForTimeout(400);
  expect.soft(await escala(), "pinça não fez zoom").toBeGreaterThan(1.3);
  // arrastar para baixo fecha (com zoom reposto)
  await app.touchscreen.tap(196, 430);
  await app.waitForTimeout(80);
  await app.touchscreen.tap(196, 430);
  await app.waitForTimeout(500);
  await gesto(app, [linha({ x: 196, y: 300 }, { x: 200, y: 600 }, 14)], { alvo: '[role="dialog"]' });
  await app.waitForTimeout(700);
  await expect.soft(app.locator('[role="dialog"][aria-label="Fotografia"]'), "arrastar para baixo não fechou").toHaveCount(0);
});

test("tocar na tab ativa volta ao topo", async ({ app }) => {
  await app.goto("/historico");
  await assentar(app);
  await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTo({ top: 1200 }));
  await app.waitForTimeout(300);
  await app.getByRole("link", { name: "Histórico" }).click();
  await app.waitForTimeout(800);
  expect.soft(await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTop), "não voltou ao topo").toBeLessThan(5);
});

test("scroll restaurado ao voltar do detalhe", async ({ app }) => {
  await app.goto("/historico");
  await assentar(app);
  // a lista entra num render diferido: esperar que tenha altura para 600 px
  await app.waitForFunction(() => {
    const s = document.querySelector(".scroll-area")!;
    return s.scrollHeight - s.clientHeight > 900;
  });
  await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTo({ top: 600 }));
  await app.waitForTimeout(300);
  expect(await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTop)).toBe(600);
  await app.getByRole("link", { name: "Aquários" }).click();
  await assentar(app, 700);
  await app.getByRole("link", { name: "Histórico" }).click();
  await assentar(app, 900);
  const top = await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTop);
  expect.soft(Math.abs(top - 600), `scroll não restaurado (${top})`).toBeLessThan(30);
});

test("pull-to-refresh no histórico", async ({ app }, info) => {
  await app.goto("/historico");
  await assentar(app);
  let pedidos = 0;
  app.on("request", (r) => r.url().includes("/rest/v1/") && r.method() === "GET" && pedidos++);
  await gesto(app, [linha({ x: 200, y: 260 }, { x: 200, y: 460 }, 14)], { alvo: ".scroll-area" });
  await app.waitForTimeout(200);
  await captura(app, info, "pull-to-refresh");
  await app.waitForTimeout(1200);
  expect.soft(pedidos, "puxar para baixo não atualizou os dados").toBeGreaterThan(0);
});

test("toque longo numa linha abre ações", async ({ app }) => {
  await app.goto("/historico");
  await assentar(app);
  const linha1 = app.locator("main section button").first();
  const b = await linha1.boundingBox();
  await gesto(app, [Array.from({ length: 40 }, () => ({ x: b!.x + 60, y: b!.y + b!.height / 2 }))], { passoMs: 16 });
  await app.waitForTimeout(400);
  await expect.soft(app.getByRole("button", { name: "Cancelar" }), "toque longo não abriu a action sheet").toBeVisible();
});
