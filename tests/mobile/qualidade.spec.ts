import AxeBuilder from "@axe-core/playwright";
import { achado, assentar, expect, test } from "./fixtures";

test.describe("acessibilidade (axe-core)", () => {
  test.beforeEach(({}, info) => test.skip(!["iphone-15", "pixel-7"].includes(info.project.name)));
  const ROTAS = [["aquarios", "/aquarios"], ["detalhe", "/aquario?id=a1"], ["detalhe-atraso", "/aquario?id=a2"], ["inicio", "/"], ["historico", "/historico"], ["definicoes", "/definicoes"], ["alertas", "/alertas"], ["fontes", "/fontes"]];
  // claro e escuro (o tema escuro tem tokens próprios: o contraste também tem de passar)
  for (const tema of ["light", "dark"] as const)
  for (const [nome, url] of ROTAS) {
    test(`axe ${nome}${tema === "dark" ? " (escuro)" : ""}`, async ({ app }, info) => {
      await app.emulateMedia({ colorScheme: tema });
      await app.goto(url);
      await assentar(app, 1200);
      const r = await new AxeBuilder({ page: app as never }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("#__moldura").analyze();
      for (const v of r.violations) achado(info, `axe:${v.impact}`, `${nome}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
      const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect.soft(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
    });
  }
});

test.describe("estabilidade visual (CLS)", () => {
  test.beforeEach(({}, info) => test.skip(!["iphone-15", "pixel-7"].includes(info.project.name)));
  for (const [nome, url] of [["aquarios", "/aquarios"], ["historico", "/historico"], ["galeria", "/aquario?id=a1"]]) {
    test(`CLS ${nome}`, async ({ app }) => {
      await app.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
              if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        } catch {}
      });
      await app.goto(url);
      await assentar(app, 1500);
      if (nome === "galeria") {
        await app.getByRole("tab", { name: "Fotos" }).click();
        await assentar(app, 1500);
      }
      const cls = await app.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect.soft(cls, `CLS ${nome}`).toBeLessThan(0.05);
    });
  }
});

test.describe("performance (Chromium, CPU 4×)", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "pixel-7"));

  async function medir(page: import("@playwright/test").Page, acao: () => Promise<void>) {
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number[]; __rodar: boolean };
      w.__frames = [];
      w.__rodar = true;
      let ultimo = performance.now();
      const loop = (t: number) => {
        w.__frames.push(t - ultimo);
        ultimo = t;
        if (w.__rodar) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await acao();
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const w = window as unknown as { __frames: number[]; __rodar: boolean };
      w.__rodar = false;
      const f = w.__frames.slice(1);
      const longos = f.filter((x) => x > 50).length;
      const media = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
      return { fps: Math.round(1000 / media), longos, pior: Math.round(Math.max(...f)) };
    });
  }

  test("transições e sheets com CPU 4×", async ({ app }, info) => {
    const cdp = await app.context().newCDPSession(app);
    await app.goto("/aquarios");
    await assentar(app, 1200);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const nav = await medir(app, async () => {
      await app.getByRole("link", { name: /^Abrir Principal/ }).click({ position: { x: 140, y: 34 } });
      await app.waitForURL(/aquario/);
    });
    const sheet = await medir(app, async () => {
      await app.getByRole("button", { name: "Registar", exact: true }).click();
    });
    achado(info, "perf", `navegação: ${JSON.stringify(nav)} · sheet: ${JSON.stringify(sheet)}`);
    expect.soft(nav.longos, `frames > 50 ms na navegação (${JSON.stringify(nav)})`).toBeLessThanOrEqual(3);
    expect.soft(sheet.longos, `frames > 50 ms ao abrir a sheet (${JSON.stringify(sheet)})`).toBeLessThanOrEqual(2);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  });

  test("instalável como PWA", async ({ app }) => {
    const cdp = await app.context().newCDPSession(app);
    await app.goto("/");
    await assentar(app, 1000);
    const r = (await cdp.send("Page.getInstallabilityErrors")) as { installabilityErrors: { errorId: string }[] };
    expect(r.installabilityErrors.map((e) => e.errorId)).toEqual([]);
  });
});
