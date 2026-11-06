import { assentar, captura, expect, test, verificarLayout } from "./fixtures";

// Integração do Aquarium Visual Kit (Início, Detalhe, Fauna) com dados reais do mock
test.beforeEach(({}, info) => {
  test.skip(!["iphone-15-pro-max", "iphone-se", "pixel-7"].includes(info.project.name));
});

test("Detalhe: ciclo de TPA e parâmetros medidos", async ({ app, erros }, info) => {
  await app.goto("/aquario?id=a1");
  await assentar(app, 1000);
  const seccao = app.getByRole("heading", { name: "Água e manutenção" });
  await seccao.scrollIntoViewIfNeeded();
  await assentar(app, 500);
  await captura(app, info, "kit-detalhe");
  await verificarLayout(app, info, "kit-detalhe");
  await expect(app.getByRole("heading", { name: "Troca de água" })).toBeVisible();
  // só parâmetros medidos (a1 tem NO₃, pH, temperatura, NO₂…) e nunca mais de 4
  const n = await app.locator("section[aria-labelledby] h3").filter({ hasText: /^(pH|Temperatura|NO₂|NO₃|GH|KH)$/ }).count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(4);
  expect(erros).toEqual([]);
});

test("Detalhe sem medições: só o ciclo de TPA", async ({ app }) => {
  await app.goto("/aquario?id=a2");
  await assentar(app, 1000);
  await expect(app.getByRole("heading", { name: "Troca de água" })).toBeVisible();
  expect(await app.locator("h3").filter({ hasText: /^(pH|NO₃)$/ }).count()).toBe(0);
});

test("Início: água do aquário medido mais recentemente", async ({ app, erros }, info) => {
  await app.goto("/");
  await assentar(app, 1000);
  const agua = app.getByRole("heading", { name: "Água", exact: true });
  await agua.scrollIntoViewIfNeeded();
  await assentar(app, 400);
  await captura(app, info, "kit-inicio");
  await verificarLayout(app, info, "kit-inicio");
  expect(erros).toEqual([]);
});

test("Fauna sem fotografia usa o desenho do kit", async ({ app }, info) => {
  await app.goto("/aquario?id=a1");
  await assentar(app, 1000);
  await app.getByRole("tab", { name: "Fauna" }).click();
  await assentar(app, 600);
  await captura(app, info, "kit-fauna");
});
