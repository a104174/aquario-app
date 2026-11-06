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

/** Faz scroll do contentor para o campo ficar com folga dentro da zona visível. */
export function mostrarCampo(el: HTMLElement, visivel: number) {
  const c = contentorScroll(el);
  const r = el.getBoundingClientRect();
  const folga = 24;
  if (c) {
    const cr = c.getBoundingClientRect();
    const fundo = Math.min(cr.bottom, visivel) - folga;
    const topo = Math.max(cr.top, 0) + folga;
    if (r.bottom > fundo) c.scrollBy({ top: r.bottom - fundo, behavior: "smooth" });
    else if (r.top < topo) c.scrollBy({ top: r.top - topo, behavior: "smooth" });
  }
  // O iOS às vezes desloca a janela inteira (body é fixo): repor
  if (window.scrollY !== 0) window.scrollTo(0, 0);
}

export function iniciarTeclado() {
  const vv = window.visualViewport;
  const raiz = document.documentElement;
  let base = window.innerHeight; // altura sem teclado
  let aberto = false;
  let raf = 0;

  const atualizar = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const foco = document.activeElement;
      const temFoco = editavel(foco);
      const visivel = vv ? vv.height : window.innerHeight;
      if (!temFoco) base = Math.max(window.innerHeight, visivel);
      // aberto: a área visível encolheu muito em relação a "sem teclado"
      const agora = temFoco && base - visivel > 120;
      // --kb: quanto o teclado tapa o layout viewport. No iOS = altura do
      // teclado; no Android (resizes-content) = 0, porque o layout já encolheu.
      const sobreposto = agora ? Math.max(0, Math.round(window.innerHeight - visivel - (vv?.offsetTop ?? 0))) : 0;
      // Sem teclado não fixamos altura em px: no iOS (standalone) o innerHeight
      // pode ser menor do que o ecrã e deixava uma faixa vazia no fundo.
      if (agora) raiz.style.setProperty("--vv-h", `${Math.round(visivel)}px`);
      else raiz.style.removeProperty("--vv-h");
      raiz.style.setProperty("--kb", `${sobreposto}px`);
      if (agora !== aberto) {
        aberto = agora;
        if (agora) raiz.dataset.teclado = "aberto";
        else delete raiz.dataset.teclado;
      }
      if (agora) setTimeout(() => mostrarCampo(foco as HTMLElement, visivel), 30);
      else if (window.scrollY !== 0) window.scrollTo(0, 0);
    });
  };

  vv?.addEventListener("resize", atualizar);
  vv?.addEventListener("scroll", atualizar);
  window.addEventListener("resize", atualizar);
  document.addEventListener("focusin", () => setTimeout(atualizar, 60));
  document.addEventListener("focusout", () => setTimeout(atualizar, 60));
  window.addEventListener("orientationchange", () => setTimeout(atualizar, 300));
  atualizar();
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
 * (next se houver um campo a seguir, done no último) e Enter salta para o
 * campo seguinte ou fecha o teclado — sem submeter o formulário por engano.
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
    el.enterKeyHint = i >= 0 && i < campos.length - 1 ? "next" : "done";
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
    el.blur();
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
