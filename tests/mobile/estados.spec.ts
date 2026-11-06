import type { Page } from "@playwright/test";
import { achado, assentar, captura, expect, test, verificarLayout } from "./fixtures";

// Permissões, paisagem e "reduzir movimento": iPhone 15 (WebKit) e Pixel 7 (Chromium)
test.beforeEach(({}, info) => {
  test.skip(!["iphone-15", "pixel-7"].includes(info.project.name), "só iPhone 15 e Pixel 7");
});

/** Notification/Push simulados: estado inicial + contador de pedidos ao sistema. */
async function simularNotificacoes(page: Page, permissao: NotificationPermission) {
  await page.addInitScript((p) => {
    const w = window as unknown as Record<string, unknown>;
    w.__pedidosNotificacao = 0;
    w.Notification = class {
      static permission = p;
      static async requestPermission() {
        (w.__pedidosNotificacao as number)++;
        return "denied";
      }
    };
    w.PushManager = function () {};
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: async () => undefined, register: async () => ({}), ready: new Promise(() => {}) },
    });
  }, permissao);
}

/** Câmara: estado da permissão + contador de aberturas do seletor de ficheiros. */
async function simularCamara(page: Page, estado: PermissionState) {
  await page.addInitScript((e) => {
    const w = window as unknown as Record<string, number>;
    w.__aberturasCamara = 0;
    const click = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === "file") {
        if (this.hasAttribute("capture")) w.__aberturasCamara++;
        return;
      }
      return click.call(this);
    };
    const original = navigator.permissions?.query?.bind(navigator.permissions);
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: (d: PermissionDescriptor) =>
          (d.name as string) === "camera"
            ? Promise.resolve({ state: e, addEventListener() {}, removeEventListener() {} })
            : original?.(d),
      },
    });
  }, estado);
}

async function abrirDefinicoesNotificacoes(app: Page) {
  await app.goto("/definicoes");
  await assentar(app);
  await app.getByText("Notificações push", { exact: true }).scrollIntoViewIfNeeded();
  await app.waitForTimeout(300);
}

test("notificações: explicação antes do pedido do sistema", async ({ app, erros }, info) => {
  await simularNotificacoes(app, "default");
  await abrirDefinicoesNotificacoes(app);
  await app.getByRole("button", { name: "Ativar" }).click();
  await assentar(app, 700);
  await expect(app.getByText("Lembretes na hora certa")).toBeVisible();
  expect(await app.evaluate(() => (window as unknown as Record<string, number>).__pedidosNotificacao), "pediu ao sistema antes de explicar").toBe(0);
  await captura(app, info, "permissao-notificacoes");
  await verificarLayout(app, info, "permissao-notificacoes");
  await app.getByRole("button", { name: "Agora não" }).click();
  await assentar(app, 600);
  await expect(app.getByText("Lembretes na hora certa")).toBeHidden();
  expect(await app.evaluate(() => (window as unknown as Record<string, number>).__pedidosNotificacao)).toBe(0);
  // Permitir → pedido do sistema (simulado: recusado) → passos para resolver
  await app.getByRole("button", { name: "Ativar" }).click();
  await assentar(app, 700);
  await app.getByRole("button", { name: "Permitir notificações" }).click();
  await assentar(app, 700);
  expect(await app.evaluate(() => (window as unknown as Record<string, number>).__pedidosNotificacao)).toBe(1);
  expect(erros).toEqual([]);
});

test("notificações recusadas: passos e alternativa", async ({ app, erros }, info) => {
  await simularNotificacoes(app, "denied");
  await abrirDefinicoesNotificacoes(app);
  await expect(app.getByText("Voltar a permitir")).toBeVisible();
  await app.getByText("Voltar a permitir").scrollIntoViewIfNeeded();
  await app.waitForTimeout(300);
  await expect(app.getByRole("button", { name: "Usar email entretanto" })).toBeVisible();
  await captura(app, info, "permissao-notificacoes-recusada");
  await app.getByRole("button", { name: "Usar email entretanto" }).click();
  await expect(app.getByRole("switch", { name: "Lembretes por email" })).toHaveAttribute("aria-checked", "true");
  expect(erros).toEqual([]);
});

async function abrirFormFoto(app: Page) {
  await app.goto("/aquario?id=a1");
  await assentar(app);
  await app.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(app, 700);
  await app.getByRole("button", { name: /^Foto/ }).click();
  await assentar(app, 600);
}

test("câmara: explicação só na primeira vez", async ({ app, erros }, info) => {
  await simularCamara(app, "prompt");
  await abrirFormFoto(app);
  const aberturas = () => app.evaluate(() => (window as unknown as Record<string, number>).__aberturasCamara);
  await app.getByRole("button", { name: "Câmara", exact: true }).click();
  const painel = app.getByRole("region", { name: "Acesso à câmara" });
  await expect(painel).toBeVisible();
  expect(await aberturas(), "abriu a câmara sem explicar").toBe(0);
  await assentar(app, 400);
  await captura(app, info, "permissao-camara");
  await app.getByRole("button", { name: "Agora não" }).click();
  await expect(painel).toBeHidden();
  expect(await aberturas()).toBe(0);
  await app.getByRole("button", { name: "Câmara", exact: true }).click();
  await app.getByRole("button", { name: "Continuar" }).click();
  expect(await aberturas()).toBe(1);
  // já explicado: a seguir abre diretamente
  await app.getByRole("button", { name: "Câmara", exact: true }).click();
  await expect(painel).toBeHidden();
  expect(await aberturas()).toBe(2);
  expect(erros).toEqual([]);
});

test("câmara recusada: passos e galeria", async ({ app, erros }, info) => {
  await simularCamara(app, "denied");
  await abrirFormFoto(app);
  await app.getByRole("button", { name: "Câmara", exact: true }).click();
  await expect(app.getByText("A câmara está bloqueada")).toBeVisible();
  await expect(app.getByRole("button", { name: "Usar a galeria" })).toBeVisible();
  await assentar(app, 400);
  await captura(app, info, "permissao-camara-recusada");
  expect(await app.evaluate(() => (window as unknown as Record<string, number>).__aberturasCamara)).toBe(0);
  expect(erros).toEqual([]);
});

// ---------------------------------------------------------------- paisagem
const PAISAGEM: Record<string, { w: number; h: number; lado: number; fundo: number }> = {
  "iphone-15": { w: 852, h: 393, lado: 59, fundo: 21 },
  "pixel-7": { w: 915, h: 412, lado: 0, fundo: 0 },
};

async function rodar(app: Page, nome: string) {
  const p = PAISAGEM[nome];
  await app.setViewportSize({ width: p.w, height: p.h });
  await app.evaluate((p) => {
    const s = document.querySelector("style[data-teste=safe]");
    if (s)
      s.textContent = `:root{--safe-top:0px !important;--safe-bottom:${p.fundo}px !important;--safe-left:${p.lado}px !important;--safe-right:${p.lado}px !important}`;
  }, p);
  await app.waitForTimeout(400);
  return p;
}

for (const [ecra, url] of [
  ["aquarios", "/aquarios"],
  ["detalhe", "/aquario?id=a1"],
  ["historico", "/historico"],
] as const) {
  test(`paisagem: ${ecra}`, async ({ app, erros }, info) => {
    await app.goto(url);
    await assentar(app);
    const p = await rodar(app, info.project.name);
    await captura(app, info, `paisagem-${ecra}`);
    await verificarLayout(app, info, `paisagem-${ecra}`);
    const r = await app.evaluate(() => {
      const main = document.querySelector("main.conteudo-ecra")!;
      // slides fora de vista num carrossel não contam (estão escondidos de propósito)
      const conteudo = [...main.querySelectorAll("a, button, h2, p")].filter((e) => !e.closest("[aria-roledescription=carrossel]")).map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
      const titulo = document.querySelector(".header-ambient h1")!.getBoundingClientRect();
      const tab = document.querySelector("nav.tabbar")!.getBoundingClientRect();
      return {
        esquerda: Math.min(...conteudo.map((b) => b.left)),
        direita: Math.max(...conteudo.map((b) => b.right)),
        titulo: titulo.left,
        tabFundo: tab.bottom,
        largura: innerWidth,
        altura: innerHeight,
        scrollX: document.scrollingElement!.scrollWidth - innerWidth,
      };
    });
    expect.soft(r.esquerda, `${ecra}: conteúdo por baixo do notch`).toBeGreaterThanOrEqual(p.lado);
    expect.soft(r.direita, `${ecra}: conteúdo por baixo do notch (direita)`).toBeLessThanOrEqual(r.largura - p.lado);
    expect.soft(r.titulo, `${ecra}: título por baixo do notch`).toBeGreaterThanOrEqual(p.lado);
    expect.soft(r.tabFundo, `${ecra}: tab bar fora do fundo`).toBe(r.altura);
    expect.soft(r.scrollX, `${ecra}: scroll horizontal`).toBeLessThanOrEqual(0);
    expect(erros).toEqual([]);
  });
}

test("paisagem: sheet registar e formulário", async ({ app, erros }, info) => {
  await app.goto("/aquario?id=a1");
  await assentar(app);
  await rodar(app, info.project.name);
  await app.getByRole("button", { name: "Registar", exact: true }).click();
  await assentar(app, 800);
  await app.getByRole("button", { name: /^Medição/ }).click();
  await assentar(app, 700);
  await app.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await captura(app, info, "paisagem-form-medicao");
  const r = await app.evaluate(() => {
    const d = document.querySelector("[data-vaul-drawer]")!.getBoundingClientRect();
    const guardar = [...document.querySelectorAll("[data-vaul-drawer] button")].find((b) => b.textContent?.trim() === "Guardar")!.getBoundingClientRect();
    return { topo: d.top, fundo: d.bottom, guardar: guardar.bottom, h: innerHeight };
  });
  expect.soft(r.topo, "sheet sai pelo topo").toBeGreaterThanOrEqual(0);
  expect.soft(r.guardar, "Guardar fora do ecrã").toBeLessThanOrEqual(r.h);
  expect(erros).toEqual([]);
});

// ------------------------------------------------------ reduzir movimento
/** Regista, durante `ms`, as animações/transições que mexem em transform. */
async function amostrarMovimento(app: Page, acao: () => Promise<void>, ms = 900) {
  await app.evaluate((ms) => {
    const w = window as unknown as { __mov: string[] };
    w.__mov = [];
    const fim = performance.now() + ms;
    const passo = () => {
      for (const a of document.getAnimations()) {
        const alvo = (a.effect as KeyframeEffect | null)?.target as Element | null;
        const pseudo = (a.effect as KeyframeEffect | null)?.pseudoElement ?? "";
        let props: string[] = [];
        if ("transitionProperty" in a) props = [(a as CSSTransition).transitionProperty];
        else props = ((a.effect as KeyframeEffect | null)?.getKeyframes() ?? []).flatMap((k) => Object.keys(k));
        const mexe = props.some((p) => /^(transform|translate|scale|rotate)$/.test(p));
        if (!mexe || !alvo) continue;
        // vaul: a sheet continua a deslizar (como no iOS com "Reduzir movimento")
        if (alvo.closest("[data-vaul-drawer], [data-vaul-drawer-wrapper]") && "transitionProperty" in a) continue;
        const nome = `${alvo.tagName.toLowerCase()}.${[...alvo.classList].slice(0, 2).join(".")}${pseudo}:${"animationName" in a ? (a as CSSAnimation).animationName : props.join(",")}`;
        if (!w.__mov.includes(nome)) w.__mov.push(nome);
      }
      if (performance.now() < fim) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }, ms);
  await acao();
  await app.waitForTimeout(ms + 100);
  return app.evaluate(() => (window as unknown as { __mov: string[] }).__mov);
}

test("reduzir movimento: só fades", async ({ app, erros }, info) => {
  await app.emulateMedia({ reducedMotion: "reduce" });
  await app.goto("/aquarios");
  await assentar(app, 1200);
  const nav = await amostrarMovimento(app, () => app.getByRole("link", { name: /^Abrir Principal/ }).click({ position: { x: 140, y: 34 } }));
  await assentar(app);
  const tabs = await amostrarMovimento(app, () => app.getByRole("tab", { name: "Gráficos" }).click());
  const voltar = await amostrarMovimento(app, () => app.getByRole("button", { name: "Aquários" }).first().click());
  const todos = [...new Set([...nav, ...tabs, ...voltar])];
  if (todos.length) achado(info, "motion", `reduzir movimento: animações com transform → ${todos.join(" · ")}`);
  expect.soft(todos, "animações com movimento com 'reduzir movimento' ativo").toEqual([]);
  expect(erros).toEqual([]);
});
