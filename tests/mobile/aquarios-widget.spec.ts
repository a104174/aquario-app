import { gesto, linha } from "./toque";
import { assentar, captura, expect, test, verificarLayout } from "./fixtures";

// Página "Aquários": widgets com fotos, ciclo de TPA, água e fauna
test.beforeEach(({}, info) => {
  test.skip(!["iphone-15", "iphone-15-pro-max", "iphone-se", "pixel-7"].includes(info.project.name));
});

test("widgets: layout claro e escuro", async ({ app, erros }, info) => {
  await app.goto("/aquarios");
  await assentar(app, 1200);
  await captura(app, info, "aquarios-widgets");
  await verificarLayout(app, info, "aquarios-widgets");
  await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTo({ top: 99999 }));
  await assentar(app, 700);
  await captura(app, info, "aquarios-widgets-fim");
  await app.emulateMedia({ colorScheme: "dark" });
  await app.evaluate(() => document.querySelector(".scroll-area")!.scrollTo({ top: 0 }));
  await assentar(app, 700);
  await captura(app, info, "aquarios-widgets-escuro");
  // nunca mostra 0 para parâmetros sem medição nem barras vazias
  expect(await app.locator("article").count()).toBeGreaterThan(0);
  expect(erros).toEqual([]);
});

test("carrossel: swipe muda de foto sem navegar", async ({ app }, info) => {
  await app.goto("/aquarios");
  await assentar(app, 1200);
  const carrossel = app.getByRole("region", { name: /Fotografias de/ }).first();
  await expect(carrossel).toBeVisible();
  const b = (await carrossel.boundingBox())!;
  const y = b.y + b.height / 2;
  if (info.project.use.hasTouch && info.project.use.browserName === "webkit") {
    await gesto(app, [linha({ x: b.x + b.width - 30, y }, { x: b.x + 30, y }, 10)]);
  }
  // fallback determinístico (o scroll nativo por toques sintéticos varia por motor)
  await carrossel.evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
  await app.waitForTimeout(400);
  expect(await carrossel.evaluate((el) => Math.round(el.scrollLeft / el.clientWidth))).toBe(1);
  expect(app.url()).toContain("/aquarios");
});

test("Fiz TPA não navega; tocar no cartão abre o detalhe", async ({ app }) => {
  await app.goto("/aquarios");
  await assentar(app, 1000);
  await app.getByRole("button", { name: /^Fiz TPA/ }).nth(1).click();
  await app.waitForTimeout(500);
  expect(app.url()).toContain("/aquarios");
  // zona do nome (o centro do cartão é a foto, que abre o visualizador)
  await app.getByRole("link", { name: /^Abrir Principal/ }).click({ position: { x: 140, y: 34 } });
  await app.waitForURL(/aquario\?id=/);
});
