"use client";

/**
 * Teclado virtual.
 *
 * iOS: o teclado não muda o layout viewport — só o visualViewport encolhe
 *      (e a página pode ser "empurrada" para cima).
 * Android: com interactive-widget=resizes-content o layout viewport encolhe.
 *
 * Em ambos os casos expomos em <html>:
 *   --vv-h  altura realmente visível (px)
 *   --kb    altura do teclado (px; 0 se fechado)
 *   data-teclado="aberto"
 * e garantimos que o campo focado fica visível acima do teclado.
 */
const TIPOS_SEM_TECLADO = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"]);

export function editavel(el: Element | null): boolean {
  if (!el) return false;
  const h = el as HTMLElement;
  if (h.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.tagName === "INPUT" && !TIPOS_SEM_TECLADO.has((el as HTMLInputElement).type);
}

/** Primeiro antepassado com scroll vertical. */
function contentorScroll(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

export type EstadoTeclado = {
  /** altura visível (px) */
  vvh: number;
  /** topo da zona visível no referencial dos elementos fixos (iOS desloca-a ao focar) */
  topo: number;
  /** altura do teclado (px; 0 se fechado) */
  kb: number;
  aberto: boolean;
};

let estado: EstadoTeclado = { vvh: 0, topo: 0, kb: 0, aberto: false };
const ouvintesEstado = new Set<() => void>();
export const estadoTeclado = () => estado;
export function subscreverTeclado(f: () => void) {
  ouvintesEstado.add(f);
  return () => ouvintesEstado.delete(f);
}

/**
 * Faz scroll do contentor do campo (a sheet ou o ecrã, nunca a página) para
 * o deixar dentro da zona visível [topo, fundo], com folga.
 */
export function mostrarCampo(el: HTMLElement, topoVisivel: number, fundoVisivel: number, suave = true) {
  const c = contentorScroll(el);
  if (!c) return;
  const r = el.getBoundingClientRect();
  const cr = c.getBoundingClientRect();
  const folga = 20;
  const fundo = Math.min(cr.bottom, fundoVisivel) - folga;
  const topo = Math.max(cr.top, topoVisivel) + folga;
  const behavior: ScrollBehavior = suave && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto";
  if (r.bottom > fundo) c.scrollBy({ top: r.bottom - fundo, behavior });
  else if (r.top < topo) c.scrollBy({ top: r.top - topo, behavior });
}

/**
 * Motor do teclado (um só para a app inteira), a partir do visualViewport.
 * Publica em <html>:
 *   --vvh / --vv-h     altura visível
 *   --vv-topo          topo da zona visível (o iOS desloca-a ao focar um campo)
 *   --vv-fundo         fundo da zona visível → as sheets ancoram aqui
 *   --kb-height / --kb altura do teclado (0 fechado)
 *   data-teclado="aberto"
 * Não força scroll da janela com o teclado aberto: o iOS desloca o viewport
 * para mostrar o campo e as âncoras acima já o compensam. Só ao fechar se
 * repõe a posição (sem saltos nem espaço em branco).
 */
export function iniciarTeclado() {
  const vv = window.visualViewport;
  const raiz = document.documentElement;
  let base = window.innerHeight; // altura sem teclado
  let raf = 0;
  let assentar = 0;

  const aplicar = () => {
    const foco = document.activeElement;
    const temFoco = editavel(foco);
    const visivel = vv ? vv.height : window.innerHeight;
    const topo = vv ? Math.max(0, vv.offsetTop) : 0;
    if (!temFoco) base = Math.max(window.innerHeight, visivel);
    const aberto = temFoco && base - visivel > 120;
    // teclado: o que falta da zona visível até ao fundo do layout
    const kb = aberto ? Math.max(0, Math.round(window.innerHeight - visivel - topo)) : 0;
    const vvh = Math.round(aberto ? visivel : window.innerHeight);
    const fundo = aberto ? Math.round(topo + visivel) : window.innerHeight;
    const s = raiz.style;
    s.setProperty("--vvh", `${vvh}px`);
    s.setProperty("--vv-topo", `${aberto ? Math.round(topo) : 0}px`);
    s.setProperty("--vv-fundo", `${fundo}px`);
    s.setProperty("--kb-height", `${kb}px`);
    s.setProperty("--kb", `${kb}px`);
    // --vv-h (altura da app) só com o teclado: sem ele a app vai até ao fundo
    if (aberto) s.setProperty("--vv-h", `${vvh}px`);
    else s.removeProperty("--vv-h");
    if (aberto !== estado.aberto) {
      if (aberto) raiz.dataset.teclado = "aberto";
      else delete raiz.dataset.teclado;
    }
    const antes = estado;
    estado = { vvh, topo: aberto ? topo : 0, kb, aberto };
    if (antes.aberto !== estado.aberto || antes.kb !== estado.kb || antes.topo !== estado.topo || antes.vvh !== estado.vvh) {
      ouvintesEstado.forEach((f) => f());
    }
    // Campo visível só quando o teclado assentar (sem eventos durante 140 ms)
    clearTimeout(assentar);
    if (aberto) {
      assentar = window.setTimeout(() => {
        const f = document.activeElement;
        if (editavel(f)) mostrarCampo(f as HTMLElement, estado.topo, estado.topo + estado.vvh);
      }, 140);
    } else if (!temFoco && (window.scrollY !== 0 || document.scrollingElement?.scrollTop)) {
      // fechou: repõe a página (o iOS pode tê-la deslocado)
      window.scrollTo(0, 0);
    }
  };
  const atualizar = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(aplicar);
  };

  vv?.addEventListener("resize", atualizar);
  vv?.addEventListener("scroll", atualizar);
  window.addEventListener("resize", atualizar);
  // trocar de campo (setas ↑/↓ da barra do iOS, Seguinte): mostrar o novo campo
  document.addEventListener("focusin", () => setTimeout(atualizar, 60));
  document.addEventListener("focusout", () => setTimeout(atualizar, 60));
  window.addEventListener("orientationchange", () => setTimeout(atualizar, 300));
  aplicar();
}

/**
 * Foca um campo só depois de as animações à volta terminarem (abrir a sheet,
 * passo do formulário). Evita a corrida animação × teclado que no iOS deixa
 * o layout desalinhado.
 */
let ultimoToque = 0;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (ultimoToque = performance.now()), { capture: true, passive: true });
}

export async function focarDepoisDaAnimacao(el: HTMLElement) {
  const inicio = performance.now();
  const esperar: Promise<unknown>[] = [];
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    for (const a of p.getAnimations()) esperar.push(a.finished.catch(() => {}));
    if (p.hasAttribute("data-vaul-drawer")) break;
  }
  // o vaul anima a abertura com transform (transição, não animação CSS)
  await new Promise((r) => setTimeout(r, 60));
  await Promise.all(esperar);
  const gaveta = el.closest("[data-vaul-drawer]");
  if (gaveta) await new Promise((r) => setTimeout(r, gaveta.getAttribute("data-assente") ? 0 : 420));
  // o utilizador já tocou ou focou outra coisa entretanto: não roubar o foco
  if (ultimoToque > inicio || editavel(document.activeElement)) return;
  if (el.isConnected && document.activeElement !== el) el.focus({ preventScroll: true });
}

const SALTAR = new Set(["date", "datetime-local", "time", "month", "week", "hidden", "file", "checkbox", "radio", "button", "submit", "range", "color"]);

/** Campos de texto "seguintes" dentro do mesmo formulário/sheet. */
function camposDoGrupo(el: HTMLElement) {
  const grupo: ParentNode = (el instanceof HTMLInputElement && el.form) || el.closest("[data-vaul-drawer], main") || document.body;
  return [...grupo.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].filter((c) => {
    if (c.disabled || c.readOnly || (c instanceof HTMLInputElement && SALTAR.has(c.type))) return false;
    const r = c.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(c).visibility !== "hidden" && c.tabIndex >= 0;
  });
}

/**
 * Teclado com "Seguinte"/"OK": cada campo recebe enterkeyhint automático
 * (next se houver um campo a seguir, done no último). Enter salta para o
 * campo seguinte; no último fecha o teclado e guarda.
 * Um campo com enterkeyhint explícito (ex.: "send", "go") mantém o seu.
 */
export function iniciarEnterAvanca() {
  document.addEventListener("focusin", (e) => {
    const el = e.target as HTMLElement;
    if (!(el instanceof HTMLInputElement) || SALTAR.has(el.type) || el.dataset.enterManual) return;
    if (el.hasAttribute("enterkeyhint") && !el.dataset.enterAuto) {
      el.dataset.enterManual = "1";
      return;
    }
    const campos = camposDoGrupo(el);
    const i = campos.indexOf(el);
    el.setAttribute("enterkeyhint", i >= 0 && i < campos.length - 1 ? "next" : "done");
    el.dataset.enterAuto = "1";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    const el = e.target as HTMLElement;
    if (!(el instanceof HTMLInputElement)) return;
    const dica = el.getAttribute("enterkeyhint") ?? el.enterKeyHint;
    if (dica !== "next" && dica !== "done") return; // send/go/search: o formulário submete normalmente
    e.preventDefault();
    if (dica === "next") {
      const campos = camposDoGrupo(el);
      const prox = campos[campos.indexOf(el) + 1];
      if (prox) {
        prox.focus({ preventScroll: true });
        return;
      }
    }
    // "OK" no último campo (automático) guarda o formulário; um "done"
    // explícito (ex.: código OTP) só fecha o teclado
    const form = el.form ?? (el.closest("[data-vaul-drawer]")?.querySelector("form") as HTMLFormElement | null);
    el.blur();
    if (el.dataset.enterAuto && form) form.requestSubmit();
  });
}

/**
 * Tocar fora de um campo fecha o teclado (como numa app nativa).
 * Não interfere com botões, links, controlos nem com outros campos.
 */
export function iniciarTocarFora() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const ativo = document.activeElement;
      if (!editavel(ativo)) return;
      const alvo = e.target as HTMLElement;
      if (editavel(alvo) || alvo.closest("input, textarea, select, label, button, a, [role=button], [role=tab], [role=switch], [contenteditable]")) return;
      (ativo as HTMLElement).blur();
    },
    { capture: true, passive: true },
  );
}
