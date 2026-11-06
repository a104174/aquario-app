import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

let js: string;
let css: string;

test.beforeAll(async () => {
  const bundle = await build({
    entryPoints: [resolve(__dirname, "exemplos.tsx")],
    outdir: "fixture",
    jsx: "automatic",
    bundle: true,
    minify: true,
    write: false,
  });
  js = bundle.outputFiles.find((f) => f.path.endsWith(".js"))!.text;
  css = bundle.outputFiles.find((f) => f.path.endsWith(".css"))!.text;
});

const moldura = `
  :root { color-scheme: light dark; --fundo: #f2f4f4; }
  @media (prefers-color-scheme: dark) {
    :root { --fundo: #121a1b; --surface: #202a2c; --surface-2: #2b3739; --text: #ecf4f3;
      --text-2: #a9bbba; --separator: #405253; --accent-forte: #8dd2c4; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fundo); color: var(--text, #1c2828); font: 1rem system-ui, sans-serif; }
  main { max-width: 52rem; margin: auto; padding: 1.25rem .875rem 2rem; }
  header p { color: var(--text-2, #556565); margin: 0 0 .25rem; font-size: .85rem; }
  h1 { margin: 0; font-size: 1.8rem; line-height: 1.1; letter-spacing: -.055em; }
  h2 { font-size: 1.12rem; margin: 1.65rem 0 .55rem; letter-spacing: -.02em; }
  .grelha { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: .5rem; }
  .fauna { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }
  .icones { display: grid; grid-template-columns: repeat(auto-fit, minmax(4.75rem, 1fr)); gap: .5rem; padding: 0; list-style: none; }
  .icones li { display: grid; place-items: center; gap: .25rem; padding: .5rem .15rem; border-radius: .7rem; background: var(--surface, white); font-size: .7rem; }
`;

async function mostrarKit(page: Page) {
  await page.setContent('<!doctype html><html lang="pt-PT"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aquarium Visual Kit</title></head><body><div id="raiz"></div></body></html>');
  await page.addStyleTag({ content: moldura + css });
  await page.addScriptTag({ content: js });
  await expect(page.getByRole("heading", { name: "Aquarium Visual Kit" })).toBeVisible();
}

test("encaixa desde cartões de ecrãs pequenos até à vista expandida", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await mostrarKit(page);

  for (const largura of [320, 440, 768]) {
    await page.setViewportSize({ width: largura, height: 956 });
    expect(await page.evaluate(() => {
      return [document.documentElement, ...document.querySelectorAll("section, figure")].every(
        (elemento) => elemento.scrollWidth <= elemento.clientWidth,
      );
    })).toBe(true);
  }

  const nitrito = page.getByRole("region", { name: "NO₂" });
  await expect(nitrito.getByText(/^0\s*mg\/L$/)).toBeVisible();
  await expect(nitrito.getByText("Variação no período")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "GH" }).getByText("Sem medições")).toBeVisible();
  await expect(page.getByText("4 de 7 dias do ciclo")).toBeVisible();
  await expect(page.getByText("Sem trocas registadas")).toBeVisible();
  await expect(page.getByRole("img", { name: "Camarão sem fotografia" })).toBeVisible();
  await expect(page.getByRole("figure", { name: /Evolução do pH/ }).getByRole("img", { name: /^4 medições/ })).toBeVisible();
});

test("passa axe em claro e escuro e respeita a preferência de movimento", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await mostrarKit(page);
  const elementos = page.locator("main *");
  const contarAnimacoes = () => elementos.evaluateAll((nos) => nos.filter(
    (no) => getComputedStyle(no).animationName !== "none",
  ).length);
  expect(await contarAnimacoes()).toBeGreaterThan(0);

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const violacoes = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violacoes.violations).toEqual([]);
    expect(await contarAnimacoes()).toBe(0);

    if (info.project.name === "webkit") {
      await page.screenshot({ path: info.outputPath(`visual-kit-${colorScheme}.png`), fullPage: true });
    }
  }
});
