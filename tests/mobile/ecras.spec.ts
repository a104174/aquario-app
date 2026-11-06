import { achado, assentar, captura, expect, test, verificarLayout } from "./fixtures";

// Ecrãs principais (com dados), em todos os dispositivos
const ECRAS: [string, string][] = [
  ["aquarios", "/"],
  ["detalhe", "/aquario?id=a1"],
  ["historico", "/historico"],
  ["definicoes", "/definicoes"],
  ["alertas", "/alertas"],
  ["produtos", "/produtos"],
  ["desejos", "/desejos"],
  ["ferias", "/ferias"],
  ["fontes", "/fontes"],
];

/** Header e tab bar fixos enquanto o conteúdo faz scroll. */
async function verificarFixos(page: import("@playwright/test").Page, ecra: string) {
  const antes = await page.evaluate(() => ({
    header: document.querySelector("header")?.getBoundingClientRect().top ?? null,
    tab: document.querySelector("nav")?.getBoundingClientRect().bottom ?? null,
    corpo: document.scrollingElement?.scrollTop ?? 0,
  }));
  await page.evaluate(() => {
    const s = document.querySelector(".scroll-area");
    s?.scrollTo({ top: s.scrollHeight });
  });
  await page.waitForTimeout(700);
  const depois = await page.evaluate(() => ({
    header: document.querySelector("header")?.getBoundingClientRect().top ?? null,
    tab: document.querySelector("nav")?.getBoundingClientRect().bottom ?? null,
    corpo: document.scrollingElement?.scrollTop ?? 0,
    h: innerHeight,
  }));
  expect.soft(depois.header, `${ecra}: header mexeu`).toBe(antes.header);
  expect.soft(depois.tab, `${ecra}: tab bar não está colada ao fundo`).toBe(depois.h);
  expect.soft(depois.corpo, `${ecra}: a página inteira fez scroll`).toBe(0);
}

test.describe("ecrãs com dados", () => {
  for (const [nome, url] of ECRAS) {
    test(`${nome}`, async ({ app, erros }, info) => {
      await app.goto(url);
      await assentar(app);
      await captura(app, info, `${nome}`);
      await verificarLayout(app, info, nome);
      await verificarFixos(app, nome);
      await captura(app, info, `${nome}-fim-scroll`);
      expect(erros).toEqual([]);
    });
  }
});

test.describe("modo escuro", () => {
  test.use({ colorScheme: "dark" });
  for (const [nome, url] of ECRAS.slice(0, 5)) {
    test(`${nome} escuro`, async ({ app, erros }, info) => {
      await app.goto(url);
      await assentar(app);
      await captura(app, info, `${nome}-escuro`);
      await verificarLayout(app, info, `${nome}-escuro`);
      expect(erros).toEqual([]);
    });
  }
});

test.describe("estados (iPhone 15)", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "iphone-15"));

  test.describe("vazio", () => {
    test.use({ cenario: "vazio" });
    for (const [nome, url] of [["aquarios", "/"], ["historico", "/historico"], ["alertas", "/alertas"], ["desejos", "/desejos"]]) {
      test(`${nome} vazio`, async ({ app, erros }, info) => {
        await app.goto(url);
        await assentar(app);
        await captura(app, info, `${nome}-vazio`);
        await verificarLayout(app, info, `${nome}-vazio`);
        expect(erros).toEqual([]);
      });
    }
  });

  test.describe("a carregar", () => {
    test.use({ rede: "lento" });
    test("aquarios a carregar", async ({ app }, info) => {
      await app.goto("/");
      await app.waitForTimeout(900);
      await captura(app, info, "aquarios-a-carregar");
      await expect(app.locator(".skeleton").first()).toBeVisible();
    });
    test("detalhe a carregar", async ({ app }, info) => {
      await app.goto("/aquario?id=a1");
      await app.waitForTimeout(900);
      await captura(app, info, "detalhe-a-carregar");
    });
  });

  test.describe("erro", () => {
    test.use({ rede: "erro" });
    for (const [nome, url] of [["aquarios", "/"], ["historico", "/historico"]]) {
      test(`${nome} erro`, async ({ app }, info) => {
        await app.goto(url);
        await assentar(app, 2500);
        await captura(app, info, `${nome}-erro`);
        await expect.soft(app.getByRole("button", { name: /tentar de novo/i }), "estado de erro sem 'Tentar de novo'").toBeVisible();
      });
    }
  });

  test("offline", async ({ app, context }, info) => {
    await app.goto("/");
    await assentar(app);
    await context.setOffline(true);
    await app.evaluate(() => window.dispatchEvent(new Event("offline")));
    await app.waitForTimeout(500);
    await captura(app, info, "aquarios-offline");
    await expect(app.getByText(/offline/i).first()).toBeVisible();
  });
});

test.describe("sheets e formulários (iPhone 15 + SE)", () => {
  test.beforeEach(({}, info) => test.skip(!["iphone-15", "iphone-se", "pixel-7"].includes(info.project.name)));

  const FORMS: [string, string][] = [
    ["tpa", "TPA"],
    ["medicao", "Medição"],
    ["fauna", "Fauna"],
    ["foto", "Foto"],
    ["ninhada", "Ninhada"],
  ];
  test("registar: escolha", async ({ app, erros }, info) => {
    await app.goto("/");
    await assentar(app);
    await app.getByRole("button", { name: "Registar", exact: true }).click();
    await assentar(app, 800);
    await captura(app, info, "registar");
    await verificarLayout(app, info, "registar");
    expect(erros).toEqual([]);
  });
  for (const [id, rotulo] of FORMS) {
    test(`form ${id}`, async ({ app, erros }, info) => {
      await app.goto("/aquario?id=a1");
      await assentar(app);
      await app.getByRole("button", { name: "Registar", exact: true }).click();
      await assentar(app, 700);
      await app.getByRole("button", { name: new RegExp(`^${rotulo}`) }).click();
      await assentar(app, 600);
      await app.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await captura(app, info, `form-${id}`);
      await verificarLayout(app, info, `form-${id}`);
      expect(erros).toEqual([]);
    });
  }
  test("novo aquário", async ({ app }, info) => {
    await app.goto("/");
    await assentar(app);
    await app.getByRole("button", { name: "Novo aquário" }).click();
    await assentar(app, 700);
    await captura(app, info, "form-aquario");
    await verificarLayout(app, info, "form-aquario");
  });
  test("visualizador de fotos", async ({ app }, info) => {
    await app.goto("/aquario?id=a1");
    await assentar(app);
    await app.getByRole("tab", { name: "Fotos" }).click();
    await assentar(app);
    await app.getByRole("button", { name: "Abrir foto" }).first().click();
    await assentar(app, 900);
    await captura(app, info, "visualizador");
    const sb = await app.evaluate(() => {
      const b = [...document.querySelectorAll('[role="dialog"] button')].map((e) => e.getBoundingClientRect());
      return Math.min(...b.map((r) => r.top));
    });
    const { safeTop } = info.project.use as unknown as { safeTop: number };
    if (sb < safeTop) achado(info, "safe-area", `visualizador: botões a ${sb}px, por baixo da status bar (${safeTop}px)`);
  });
});

test.describe("login", () => {
  test.use({ sessao: false });
  test("login", async ({ app, erros }, info) => {
    await app.goto("/login");
    await assentar(app);
    await captura(app, info, "login");
    await verificarLayout(app, info, "login");
    await app.getByLabel("Email").fill("eu@exemplo.pt");
    await app.getByRole("button", { name: "Enviar código" }).click();
    await assentar(app, 600);
    await captura(app, info, "login-codigo");
    expect(erros).toEqual([]);
  });
});
