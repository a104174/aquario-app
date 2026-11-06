import { assentar, captura, expect, test, verificarLayout } from "./fixtures";

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

test("Início apresenta a água da rede e mantém os atalhos personalizados", async ({ app, erros }, info) => {
  await app.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await app.goto("/");
  const atalhos = app.getByRole("region", { name: "Registo rápido" });
  await expect(atalhos.getByRole("button", { name: /TPA/ })).toBeVisible();
  await expect(atalhos.getByRole("button", { name: /Medição/ })).toBeVisible();
  await expect(atalhos.getByRole("button", { name: /Foto/ })).toBeVisible();
  await expect(atalhos.getByRole("button", { name: /Fauna/ })).toBeVisible();

  const agua = app.getByRole("link", { name: /Água da torneira/ });
  await expect(agua.getByRole("img", { name: /pH 6,5–8.*neutro em 7/ })).toBeVisible();
  await expect(agua.getByText("1,9", { exact: true })).toBeVisible();
  await expect(agua.getByText("0,24–1,52", { exact: true })).toBeVisible();

  if (info.project.name === "iphone-15-pro-max") {
    await atalhos.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await assentar(app, 250);
    await captura(app, info, "registo-rapido-escuro");
    await agua.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await assentar(app, 250);
    await captura(app, info, "agua-torneira-escuro");
  }

  await agua.click();
  await expect(app).toHaveURL(/\/fontes$/);
  await app.getByRole("link", { name: "Início", exact: true }).click();
  await atalhos.getByRole("button", { name: "Personalizar" }).click();
  await atalhos.getByRole("button", { name: "Ninhada" }).click();
  await atalhos.getByRole("button", { name: "Concluído" }).click();
  await app.reload();
  await atalhos.getByRole("button", { name: /Ninhada/ }).click();
  await expect(app.getByRole("dialog", { name: "Ninhada" })).toBeVisible();
  expect(erros).toEqual([]);
});
