import path from "node:path";
import { assentar, captura, expect, test, verificarLayout } from "./fixtures";

test("detalhar fauna mantém o total e reutiliza uma foto da galeria", async ({ app, erros }, info) => {
  await app.goto("/aquario?id=a1");
  await app.getByRole("tab", { name: "Fauna" }).click();
  const resumo = app.getByText("22 animais · 3 espécies", { exact: true });
  await expect(resumo).toBeVisible();
  await app.getByRole("button", { name: /Neon.*Grupo genérico.*×11/ }).click();
  await app.getByRole("button", { name: "Detalhar animais deste grupo" }).click();
  const detalhe = app.getByRole("dialog", { name: "Detalhar grupo" });
  await expect(detalhe.getByText(/O total mantém-se/)).toBeVisible();
  await detalhe.getByLabel("Variedade").fill("Diamante");
  await detalhe.getByRole("button", { name: "Da galeria" }).click();
  await detalhe.getByRole("button", { name: /^Escolher fotografia 1 ·/ }).click();
  await expect(detalhe.getByAltText("Fotografia selecionada")).toBeVisible();

  let uploads = 0;
  const contar = (r: import("@playwright/test").Request) => {
    if (r.method() === "POST" && /\/storage\/v1\/object\/fotos\//.test(r.url())) uploads++;
  };
  app.on("request", contar);
  await detalhe.getByRole("button", { name: "Guardar" }).click();
  await expect(detalhe).toBeHidden();
  await expect(resumo).toBeVisible();
  await expect(app.getByRole("button", { name: /Neon.*Grupo genérico.*×10/ })).toBeVisible();
  const grupo = app.getByRole("button", { name: /Neon Diamante.*Grupo identificado.*×1/ });
  await expect(grupo).toBeVisible();
  expect(uploads).toBe(0);

  if (info.project.name === "iphone-15-pro-max") {
    await resumo.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await assentar(app, 250);
    await captura(app, info, "fauna-visual");
  }

  await app.getByRole("button", { name: "Ver fotografia de Neon Diamante" }).click();
  await expect(app.getByRole("dialog", { name: "Fotografia" })).toBeVisible();
  await app.getByRole("button", { name: "Fechar", exact: true }).click();
  await grupo.click();
  await app.getByRole("button", { name: "Editar identificação e foto" }).click();
  const editar = app.getByRole("dialog", { name: "Editar fauna" });
  await editar.getByRole("button", { name: "Remover associação" }).click();
  await editar.getByRole("button", { name: "Guardar" }).click();
  await expect(editar).toBeHidden();
  await expect(app.getByRole("button", { name: "Ver fotografia de Neon Diamante" })).toHaveCount(0);
  await app.getByRole("tab", { name: "Fotos" }).click();
  await expect(app.getByRole("button", { name: "Abrir foto", exact: true })).toHaveCount(9);
  expect(erros).toEqual([]);
});

test("o detalhe suporta ausência de capa, slideshow, fullscreen e escolher capa", async ({ app, erros }, info) => {
  await app.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await app.goto("/aquario?id=a2");
  await expect(app.getByRole("heading", { name: "AQUARIUS 20 L", level: 1 })).toBeVisible();
  await expect(app.getByRole("group", { name: "Fotografias do aquário" })).toHaveCount(0);
  await expect(app.getByText("Volume", { exact: true })).toBeVisible();
  if (info.project.name === "iphone-15-pro-max") await captura(app, info, "aquario-sem-capa");

  await app.goto("/aquario?id=a1");
  const palco = app.getByRole("group", { name: "Fotografias do aquário" });
  await expect(palco.getByRole("button", { name: /Abrir fotografia 1 do aquário/ }).locator("img")).toBeVisible();
  await verificarLayout(app, info, "aquario-capa");
  if (info.project.name === "iphone-15-pro-max") await captura(app, info, "aquario-com-capa");

  const segunda = app.getByRole("button", { name: "Mostrar fotografia 2 de 5" });
  await segunda.click();
  await expect(segunda).toHaveAttribute("aria-current", "true");
  await palco.getByRole("button", { name: /Abrir fotografia 2 do aquário/ }).click();
  await expect(app.getByRole("dialog", { name: "Fotografia" })).toBeVisible();
  await app.getByRole("button", { name: "Fechar", exact: true }).click();

  await app.getByRole("button", { name: "Opções do aquário" }).click();
  await app.getByRole("button", { name: "Escolher capa" }).click();
  const sheet = app.getByRole("dialog", { name: "Capa do aquário" });
  const opcao = sheet.getByRole("button", { name: /Usar fotografia 2 como capa/ });
  const nomeFoto = (await opcao.getAttribute("aria-label"))?.split(" · ")[1];
  await opcao.click();
  await expect(sheet).toBeHidden();
  await expect(app.getByRole("button", { name: "Mostrar fotografia 1 de 5" })).toHaveAttribute("aria-current", "true");
  if (nomeFoto && !/^\d/.test(nomeFoto)) await expect(palco.getByRole("button", { name: /Abrir fotografia 1/ })).toHaveAccessibleName(new RegExp(nomeFoto));

  await app.reload();
  await app.getByRole("button", { name: "Opções do aquário" }).click();
  await app.getByRole("button", { name: "Escolher capa" }).click();
  await expect(opcao).toHaveAttribute("aria-pressed", "true");
  expect(erros).toEqual([]);
});

test("carregar foto de fauna cria uma foto privada e abre hero sem paginação se for a única", async ({ app, erros }) => {
  await app.goto("/aquario?id=a2");
  await app.getByRole("button", { name: "Fauna", exact: true }).click();
  const registo = app.getByRole("dialog", { name: "Fauna" });
  await registo.getByLabel("Espécie").fill("Betta splendens");
  await registo.getByLabel("Nome", { exact: true }).fill("Blue");
  await registo.getByLabel("Carregar fotografia").setInputFiles(path.join(__dirname, "assets", "fixture1.jpg"));
  await expect(registo.getByAltText("Fotografia selecionada")).toBeVisible();
  await registo.getByRole("button", { name: "Guardar" }).click();
  await expect(registo).toBeHidden();
  const palco = app.getByRole("group", { name: "Fotografias do aquário" });
  await expect(palco.getByRole("button", { name: /Abrir fotografia 1/ })).toBeVisible();
  await expect(app.getByRole("button", { name: /Mostrar fotografia/ })).toHaveCount(0);
  await app.getByRole("tab", { name: "Fauna" }).click();
  await expect(app.getByRole("button", { name: "Ver fotografia de Betta splendens “Blue”" })).toBeVisible();
  expect(erros).toEqual([]);
});

test("um deslize horizontal avança a capa sem mudar de ecrã", async ({ app }, info) => {
  test.skip(info.project.name !== "pixel-7", "o gesto nativo usa o protocolo do Chromium");
  await app.goto("/aquario?id=a1");
  const palco = app.getByRole("group", { name: "Fotografias do aquário" });
  await expect(palco).toBeVisible();
  const box = (await palco.boundingBox())!;
  const cdp = await app.context().newCDPSession(app);
  const ponto = (i: number) => [{ x: box.x + box.width * (0.85 - i * 0.06), y: box.y + box.height / 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: ponto(0) });
  for (let i = 1; i <= 11; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: ponto(i) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(app.getByRole("button", { name: "Mostrar fotografia 2 de 5" })).toHaveAttribute("aria-current", "true");
  await expect(app).toHaveURL(/\/aquario\?id=a1$/);
});
