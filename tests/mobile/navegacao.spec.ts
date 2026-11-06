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
