import { expect, test, verificarLayout } from "./fixtures";

test("Início e Aquários têm destinos próprios; Registar fica no centro", async ({ app, erros }, info) => {
  await app.goto("/");
  const nav = app.getByRole("navigation", { name: "Navegação principal" });
  const inicio = nav.getByRole("link", { name: "Início" });
  const aquarios = nav.getByRole("link", { name: "Aquários" });
  const registar = nav.getByRole("button", { name: "Registar" });

  await expect(inicio).toHaveAttribute("aria-current", "page");
  await expect(app.getByRole("heading", { name: "Previsão exterior" })).toBeVisible();
  await expect(app.getByText("Hoje", { exact: true })).toBeVisible();
  await expect(app.getByText("Amanhã", { exact: true })).toBeVisible();
  await expect(app.getByRole("heading", { name: "Registo rápido" })).toBeVisible();
  await expect(app.getByRole("heading", { name: "Memórias recentes" })).toBeVisible();
  await expect(app.getByRole("button", { name: "Novo aquário" })).toHaveCount(0);
  const caixa = (await registar.boundingBox())!;
  expect(Math.abs(caixa.x + caixa.width / 2 - app.viewportSize()!.width / 2)).toBeLessThan(2);
  await verificarLayout(app, info, "inicio");

  await aquarios.click();
  await expect(app).toHaveURL(/\/aquarios$/);
  await expect(aquarios).toHaveAttribute("aria-current", "page");
  await expect(app.getByRole("heading", { name: "Registo rápido" })).toHaveCount(0);
  await expect(app.getByRole("heading", { name: "Previsão exterior" })).toHaveCount(0);
  await expect(app.getByRole("button", { name: "Novo aquário" })).toBeVisible();

  await app.locator('a[href="/aquario?id=a2"]').first().click();
  await expect(app).toHaveURL(/\/aquario\?id=a2$/);
  await registar.click();
  await expect(app.getByRole("dialog")).toBeVisible();
  await app.getByRole("button", { name: /^TPA/ }).click();
  await expect(app.getByRole("dialog").getByRole("button", { name: "AQUARIUS 20 L", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(erros).toEqual([]);
});

test("Início liga a manutenção ao aquário e abre a memória selecionada", async ({ app, erros }) => {
  await app.emulateMedia({ reducedMotion: "reduce" });
  await app.goto("/");
  const agora = app.getByRole("region", { name: "Agora" });
  await expect(agora.getByRole("link", { name: /Ciclo de TPA.*de atraso.*AQUARIUS 20 L/ })).toHaveAttribute("href", "/aquario?id=a2");
  await expect(agora.getByRole("link", { name: /2 alertas ativos/ })).toHaveAttribute("href", "/alertas");

  const album = app.getByRole("region", { name: "Memórias recentes" });
  const foto = album.getByRole("button", { name: "Fotografia 2", exact: true });
  await foto.click();
  await expect(foto).toHaveAttribute("aria-current", "true");
  await expect(album.getByRole("button", { name: "Pausar rotação" })).toHaveCount(0);
  const fotografia = album.getByRole("button", { name: /Abrir fotografia de/ });
  await expect(fotografia.locator("img")).toBeVisible();
  await expect.poll(() => fotografia.locator("img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await fotografia.click();
  await expect(app.getByRole("dialog", { name: "Fotografia" })).toBeVisible();
  expect(erros).toEqual([]);
});
