import type { Page } from "@playwright/test";

type Ponto = { x: number; y: number };

/**
 * Gesto multitoque sintético (WebKit: document.createTouch; Chromium: new Touch).
 * `dedos` = lista de trajetos (um por dedo); todos com o mesmo nº de pontos.
 */
export async function gesto(page: Page, dedos: Ponto[][], opts: { passoMs?: number; alvo?: string } = {}) {
  await page.evaluate(
    async ({ dedos, passoMs, alvo }) => {
      const doc = document as Document & { createTouch?: (...a: unknown[]) => Touch; createTouchList?: (...t: Touch[]) => TouchList };
      const alvoEl = (alvo ? document.querySelector(alvo) : null) ?? document.elementFromPoint(dedos[0][0].x, dedos[0][0].y) ?? document.body;
      const mk = (id: number, p: { x: number; y: number }) => {
        try {
          return new Touch({ identifier: id, target: alvoEl, clientX: p.x, clientY: p.y, pageX: p.x, pageY: p.y, screenX: p.x, screenY: p.y });
        } catch {
          return doc.createTouch!(window, alvoEl, id, p.x, p.y, p.x, p.y);
        }
      };
      const lista = (t: Touch[]) => (doc.createTouchList ? doc.createTouchList(...t) : t) as unknown as Touch[];
      const env = (tipo: string, ativos: Touch[], mudados: Touch[]) =>
        alvoEl.dispatchEvent(new TouchEvent(tipo, { touches: lista(ativos), targetTouches: lista(ativos), changedTouches: lista(mudados), bubbles: true, cancelable: true }));
      const n = dedos[0].length;
      const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let atuais = dedos.map((d, i) => mk(i + 1, d[0]));
      env("touchstart", atuais, atuais);
      for (let k = 1; k < n; k++) {
        await esperar(passoMs);
        atuais = dedos.map((d, i) => mk(i + 1, d[k]));
        env("touchmove", atuais, atuais);
      }
      await esperar(passoMs);
      env("touchend", [], atuais);
    },
    { dedos, passoMs: opts.passoMs ?? 16, alvo: opts.alvo ?? null },
  );
}

/** Trajeto linear entre dois pontos com `n` passos. */
export const linha = (a: Ponto, b: Ponto, n = 12): Ponto[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
