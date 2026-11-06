import { achado, assentar, captura, expect, teclado, test } from "./fixtures";

// Teclado simulado: iOS = visualViewport encolhe (layout não muda);
// Android = o viewport encolhe (interactive-widget=resizes-content).
test.beforeEach(({}, info) => test.skip(!["iphone-15", "iphone-se", "pixel-7"].includes(info.project.name)));

async function abrirForm(page: import("@playwright/test").Page, rotulo: string) {
  await page.goto("/aquario?id=a1");
  await assentar(page);
  await page.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(page, 700);
  await page.getByRole("button", { name: new RegExp(`^${rotulo}`) }).click();
  await assentar(page, 600);
}

async function estado(page: import("@playwright/test").Page, alturaVisivel: number) {
  return page.evaluate((h) => {
    const foco = document.activeElement as HTMLElement | null;
    const f = foco?.getBoundingClientRect();
    const guardar = [...document.querySelectorAll("button")].find((b) => /^(Guardar|Enviar código)$/.test(b.textContent?.trim() ?? ""));
    const g = guardar?.getBoundingClientRect();
    const nav = document.querySelector("nav")?.getBoundingClientRect();
    const navEstilo = document.querySelector("nav") ? getComputedStyle(document.querySelector("nav")!) : null;
    const navVisivel = !!nav && nav.top < h - 4 && navEstilo!.visibility !== "hidden" && Number(navEstilo!.opacity) > 0.1;
    return {
      foco: foco?.tagName ?? null,
      focoVisivel: !!f && f.top >= 0 && f.bottom <= h + 1,
      focoBottom: f?.bottom ?? null,
      guardarVisivel: !!g && g.bottom <= h + 1 && g.top >= 0,
      guardarBottom: g?.bottom ?? null,
      navVisivel,
    };
  }, alturaVisivel);
}

const CASOS: [string, string, string][] = [
  ["tpa", "TPA", "#tpa-litros"],
  ["medicao-no3", "Medição", "#med-no3"],
  ["medicao-temp", "Medição", "#med-temperatura_c"],
  ["fauna", "Fauna", "#fauna-especie"],
];

for (const [nome, rotulo, seletor] of CASOS) {
  test(`teclado: ${nome}`, async ({ app }, info) => {
    await abrirForm(app, rotulo);
    await app.locator(seletor).click();
    const { kb, alturaVisivel } = await teclado(app, info, true);
    await app.waitForTimeout(400);
    const e = await estado(app, alturaVisivel);
    await captura(app, info, `teclado-${nome}`, { teclado: info.project.use.browserName === "webkit" ? kb : 0 });
    expect.soft(e.foco, "o input perdeu o foco").toBe("INPUT");
    expect.soft(e.focoVisivel, `input tapado pelo teclado (bottom ${e.focoBottom} > ${alturaVisivel})`).toBe(true);
    expect.soft(e.guardarVisivel, `Guardar tapado pelo teclado (bottom ${e.guardarBottom} > ${alturaVisivel})`).toBe(true);
    expect.soft(e.navVisivel, "tab bar visível com o teclado aberto").toBe(false);
    // fechar o teclado repõe o layout
    await app.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await teclado(app, info, false);
    await app.waitForTimeout(400);
    const depois = await app.evaluate(() => {
      const d = document.querySelector("[data-vaul-drawer]")?.getBoundingClientRect();
      const vvh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vv-h")) || innerHeight;
      return { vvh, h: innerHeight, drawerBottom: d?.bottom ?? innerHeight, scrollY, teclado: document.documentElement.dataset.teclado ?? null };
    });
    expect.soft(Math.round(depois.vvh), "espaço em branco depois de fechar o teclado (--vv-h)").toBe(depois.h);
    expect.soft(depois.teclado, "o estado 'teclado aberto' ficou preso").toBeNull();
    expect.soft(Math.round(depois.drawerBottom), "sheet não voltou ao fundo").toBe(depois.h);
    expect.soft(depois.scrollY, "a página ficou com scroll preso").toBe(0);
  });
}

test("inputs: inputmode, enterkeyhint, autocomplete", async ({ app }, info) => {
  const regras: { form: string; campos: Record<string, unknown>[] }[] = [];
  for (const rotulo of ["TPA", "Medição", "Fauna", "Ninhada"]) {
    await abrirForm(app, rotulo);
    // o enterkeyhint é atribuído no foco (next/done consoante haja campo seguinte)
    const campos = await app.evaluate(async () => {
      (document.activeElement as HTMLElement | null)?.blur();
      const lista = [...document.querySelectorAll<HTMLInputElement>("[data-vaul-drawer] input:not([type=hidden]):not([type=file]), [data-vaul-drawer] textarea")];
      const out = [];
      for (const i of lista) {
        i.focus({ preventScroll: true });
        await new Promise((r) => setTimeout(r, 20));
        out.push({ id: i.id || i.placeholder || i.type, type: i.type, inputmode: i.getAttribute("inputmode"), enterkeyhint: i.getAttribute("enterkeyhint"), autocomplete: i.getAttribute("autocomplete") });
      }
      (document.activeElement as HTMLElement | null)?.blur();
      return out;
    });
    regras.push({ form: rotulo, campos });
  }
  for (const r of regras)
    for (const c of r.campos) {
      if (["date", "datetime-local"].includes(String(c.type))) continue;
      if (!c.enterkeyhint) achado(info, "enterkeyhint", `${r.form}: ${c.id} sem enterkeyhint`);
      if (c.type === "text" && !c.autocomplete) achado(info, "autocomplete", `${r.form}: ${c.id} sem autocomplete`);
    }
  const numericos = regras.flatMap((r) => r.campos.filter((c) => /litros|med-/.test(String(c.id))));
  expect(numericos.every((c) => c.inputmode === "decimal")).toBe(true);
});

test("vírgula decimal: '7,5' vale 7,5 L", async ({ app }) => {
  await abrirForm(app, "TPA");
  await app.locator("#tpa-litros").fill("7,5");
  await expect(app.getByText("1,88 ml")).toBeVisible();
});

test("enter passa ao campo seguinte (medição)", async ({ app }) => {
  await abrirForm(app, "Medição");
  await app.locator("#med-nh3_nh4").click();
  await app.keyboard.type("0");
  await app.keyboard.press("Enter");
  const foco = await app.evaluate(() => document.activeElement?.id);
  expect.soft(foco, "Enter não passou ao campo seguinte").toBe("med-no2");
});

test("tocar fora fecha o teclado", async ({ app }) => {
  await abrirForm(app, "TPA");
  await app.locator("#tpa-litros").click();
  const box = await app.locator("[data-vaul-drawer]").boundingBox();
  await app.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height - 140);
  await app.waitForTimeout(200);
  const tag = await app.evaluate(() => document.activeElement?.tagName);
  expect.soft(tag, "o input continua focado").not.toBe("INPUT");
});

test.describe("login", () => {
  test.use({ sessao: false });
  test("OTP: colar 6 dígitos preenche e submete", async ({ app }, info) => {
    await app.goto("/login");
    await assentar(app);
    await app.getByLabel("Email").click();
    const { kb, alturaVisivel } = await teclado(app, info, true);
    const e = await estado(app, alturaVisivel);
    await captura(app, info, "teclado-login", { teclado: info.project.use.browserName === "webkit" ? kb : 0 });
    expect.soft(e.guardarVisivel, "Enviar código tapado pelo teclado").toBe(true);
    await teclado(app, info, false);
    await app.getByLabel("Email").fill("eu@exemplo.pt");
    await app.getByRole("button", { name: "Enviar código" }).click();
    await assentar(app, 500);
    const otp = app.getByLabel("Código de 6 dígitos");
    expect(await otp.getAttribute("autocomplete")).toBe("one-time-code");
    await otp.focus();
    await app.evaluate(() => {
      const i = document.activeElement as HTMLInputElement;
      const dt = new DataTransfer();
      dt.setData("text/plain", "123 456");
      i.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(app.getByText("Sessão iniciada")).toBeVisible({ timeout: 4000 });
  });
});
