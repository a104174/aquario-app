import path from "node:path";
import { assentar, captura, pastaReview, test } from "./fixtures";

// Vídeos das interações principais (iPhone 16 Pro Max): antes/depois
test.use({ video: { mode: "on", size: { width: 440, height: 956 } } });
test.beforeEach(({}, info) => test.skip(info.project.name !== "iphone-16-pro-max"));

async function guardar(app: import("@playwright/test").Page, nome: string, info: import("@playwright/test").TestInfo) {
  const v = app.video();
  await app.close();
  await v?.saveAs(path.join(pastaReview(), info.project.name, "videos", `${nome}.webm`));
}

test("video: fiz TPA, abrir aquário, registar medição", async ({ app }, info) => {
  await app.goto("/aquarios");
  await assentar(app, 1000);
  await app.getByRole("button", { name: /^Fiz TPA/ }).first().click();
  await app.waitForTimeout(650);
  await captura(app, info, "celebracao-fiz-tpa");
  await app.waitForTimeout(800);
  await app.getByRole("link", { name: /^Abrir Principal/ }).click({ position: { x: 140, y: 34 } });
  await assentar(app, 900);
  await app.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(app, 900);
  await app.getByRole("button", { name: /^Medição/ }).click();
  await assentar(app, 1000);
  await guardar(app, "fiz-tpa-navegar-registar", info);
});

test("video: navegação entre tabs", async ({ app }, info) => {
  await app.goto("/");
  await assentar(app, 900);
  for (const t of ["Aquários", "Histórico", "Definições", "Início"]) {
    await app.getByRole("link", { name: t, exact: true }).click();
    await assentar(app, 700);
  }
  await guardar(app, "tabs", info);
});
