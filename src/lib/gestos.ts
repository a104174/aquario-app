"use client";

import { useEffect, useRef, type RefObject } from "react";
import { vibrar } from "./haptic";

// =====================================================================
//  Memória de scroll por rota (como o UINavigationController/UITabBar)
// =====================================================================
const posicoes = new Map<string, number>();
const chaveAtual = () => (typeof window === "undefined" ? "" : location.pathname + location.search);

/**
 * Há uma posição de scroll guardada para este ecrã (vai ser restaurada)?
 * Recebe o pathname do router: durante o render da nova rota o `location`
 * ainda aponta para a anterior (o Next só o atualiza depois do commit).
 */
export function temScrollGuardado(pathname: string) {
  for (const [k, v] of posicoes) if (v > 0 && (k === pathname || k.startsWith(`${pathname}?`))) return true;
  return false;
}

/**
 * Restaura a posição de scroll ao voltar a um ecrã/tab e guarda-a ao sair.
 * Se o conteúdo ainda não tiver altura suficiente (dados a chegar), tenta
 * durante 1,5 s à medida que cresce.
 */
export function useMemoriaScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chave = chaveAtual();
    const alvo = posicoes.get(chave) ?? 0;
    let raf = 0;
    let restaurado = alvo === 0;
    const tentar = () => {
      if (restaurado) return;
      el.scrollTop = alvo;
      if (Math.abs(el.scrollTop - alvo) < 2) restaurado = true;
    };
    tentar();
    const ro = new ResizeObserver(tentar);
    if (el.firstElementChild) [...el.children].forEach((c) => ro.observe(c));
    // Conteúdo diferido (useDeferredValue) pode chegar tarde em aparelhos
    // lentos: continuar a tentar até 3 s, mas desistir mal o utilizador mexa.
    const desistir = () => {
      restaurado = true;
      ro.disconnect();
    };
    const fim = setTimeout(desistir, 3000);
    el.addEventListener("touchstart", desistir, { passive: true, once: true });
    el.addEventListener("wheel", desistir, { passive: true, once: true });
    const guardar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (restaurado) posicoes.set(chave, el.scrollTop);
      });
    };
    el.addEventListener("scroll", guardar, { passive: true });
    // Tocar na tab ativa → topo (como no iOS)
    const topo = () => el.scrollTo({ top: 0, behavior: "smooth" });
    window.addEventListener("aquario:topo", topo);
    return () => {
      // (não guardar aqui: no cleanup o elemento já saiu do DOM e scrollTop é 0)
      clearTimeout(fim);
      ro.disconnect();
      el.removeEventListener("touchstart", desistir);
      el.removeEventListener("wheel", desistir);
      el.removeEventListener("scroll", guardar);
      window.removeEventListener("aquario:topo", topo);
    };
  }, [ref]);
}

export function irAoTopo() {
  window.dispatchEvent(new Event("aquario:topo"));
}

// =====================================================================
//  Puxar para atualizar
//  Listeners passivos: o scroll nativo (inércia, bounce do iOS) não é
//  tocado. Funciona com o bounce do iOS (scrollTop < 0) e no Android
//  (no topo, sem bounce, mede o arrasto do dedo).
//  Motion: indicador segue o dedo com resistência (0,5×); ao passar o
//  limiar dá um "pop" (ease-pop) + haptic; enquanto atualiza roda
//  (linear — é um progresso); no fim sai a encolher (200 ms ease-in).
// =====================================================================
const LIMIAR = 64;
const MAX = 110;

export function usePuxarParaAtualizar(
  scrollRef: RefObject<HTMLElement | null>,
  indicadorRef: RefObject<HTMLElement | null>,
  aoAtualizar: (() => Promise<unknown>) | null,
) {
  const fn = useRef(aoAtualizar);
  useEffect(() => {
    fn.current = aoAtualizar;
  });
  useEffect(() => {
    const el = scrollRef.current;
    const ind = indicadorRef.current;
    if (!el || !ind || !fn.current) return;
    let y0 = 0;
    let ativo = false;
    let puxar = 0;
    let passou = false;
    let ocupado = false;

    const desenhar = (p: number, transicao = false) => {
      const prog = Math.min(1, p / LIMIAR);
      ind.style.transition = transicao ? "transform var(--dur-std) var(--ease-out), opacity var(--dur-std) var(--ease-out)" : "none";
      ind.style.opacity = String(prog);
      ind.style.transform = `translate(-50%, ${Math.round(p * 0.6)}px) scale(${0.6 + 0.4 * prog}) rotate(${Math.round(prog * 270)}deg)`;
    };
    const inicio = (e: TouchEvent) => {
      if (ocupado || e.touches.length !== 1) return;
      ativo = el.scrollTop <= 0;
      y0 = e.touches[0].clientY;
      puxar = 0;
      passou = false;
    };
    const mover = (e: TouchEvent) => {
      if (!ativo || ocupado) return;
      const dy = e.touches[0].clientY - y0;
      if (dy <= 0 && el.scrollTop >= 0) {
        if (puxar) desenhar(0);
        puxar = 0;
        return;
      }
      puxar = Math.min(MAX, Math.max(dy * 0.5, -el.scrollTop));
      if (puxar >= LIMIAR && !passou) {
        passou = true;
        vibrar("leve");
        ind.classList.remove("ptr-pop");
        void ind.offsetWidth;
        ind.classList.add("ptr-pop");
      } else if (puxar < LIMIAR) passou = false;
      desenhar(puxar);
    };
    const fim = async () => {
      if (!ativo || ocupado) return;
      ativo = false;
      if (puxar < LIMIAR) {
        desenhar(0, true);
        return;
      }
      ocupado = true;
      ind.dataset.estado = "a-atualizar";
      ind.style.transition = "transform var(--dur-std) var(--ease-out)";
      ind.style.opacity = "1";
      ind.style.transform = `translate(-50%, ${Math.round(LIMIAR * 0.6)}px) scale(1)`;
      const minimo = new Promise((r) => setTimeout(r, 600));
      try {
        await Promise.all([fn.current?.(), minimo]);
      } finally {
        delete ind.dataset.estado;
        ind.style.transition = "transform var(--dur-exit) var(--ease-in), opacity var(--dur-exit) var(--ease-in)";
        ind.style.opacity = "0";
        ind.style.transform = `translate(-50%, ${Math.round(LIMIAR * 0.6)}px) scale(0.6)`;
        setTimeout(() => {
          ocupado = false;
          desenhar(0);
        }, 220);
      }
    };
    el.addEventListener("touchstart", inicio, { passive: true });
    el.addEventListener("touchmove", mover, { passive: true });
    el.addEventListener("touchend", fim);
    el.addEventListener("touchcancel", fim);
    return () => {
      el.removeEventListener("touchstart", inicio);
      el.removeEventListener("touchmove", mover);
      el.removeEventListener("touchend", fim);
      el.removeEventListener("touchcancel", fim);
    };
  }, [scrollRef, indicadorRef]);
}

// =====================================================================
//  Swipe a partir da borda esquerda para voltar (não existe numa PWA
//  standalone no iOS). O ecrã segue o dedo; ao soltar, se passou 35%
//  da largura (ou foi rápido), sai para a direita (ease-out, duração
//  proporcional à distância que falta) e navega para trás; senão volta
//  ao sítio com a curva de assinatura.
// =====================================================================
const BORDA = 24;

export function useSwipeVoltar(ecraRef: RefObject<HTMLElement | null>, aoVoltar: (() => void) | null) {
  const fn = useRef(aoVoltar);
  useEffect(() => {
    fn.current = aoVoltar;
  });
  useEffect(() => {
    const el = ecraRef.current;
    if (!el || !fn.current) return;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let dx = 0;
    let estado: "nada" | "talvez" | "horizontal" | "vertical" = "nada";
    let passou = false;
    const w = () => el.getBoundingClientRect().width || innerWidth;

    const pintar = (x: number, transicao?: string) => {
      el.style.transition = transicao ?? "none";
      el.style.transform = x ? `translateX(${x}px)` : "";
      el.style.boxShadow = x ? `-12px 0 28px rgb(0 0 0 / ${0.18 * (1 - x / w())})` : "";
    };
    const inicio = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > BORDA) return;
      x0 = t.clientX;
      y0 = t.clientY;
      t0 = performance.now();
      dx = 0;
      passou = false;
      estado = "talvez";
    };
    const mover = (e: TouchEvent) => {
      if (estado === "nada" || estado === "vertical") return;
      const t = e.touches[0];
      const ddx = t.clientX - x0;
      const ddy = t.clientY - y0;
      if (estado === "talvez") {
        if (Math.hypot(ddx, ddy) < 10) return;
        estado = Math.abs(ddx) > Math.abs(ddy) && ddx > 0 ? "horizontal" : "vertical";
        if (estado === "vertical") return;
      }
      if (e.cancelable) e.preventDefault();
      dx = Math.max(0, ddx);
      const limiar = dx > w() * 0.35;
      if (limiar && !passou) vibrar("leve");
      passou = limiar;
      pintar(dx);
    };
    const fim = () => {
      if (estado !== "horizontal") {
        estado = "nada";
        return;
      }
      estado = "nada";
      const v = dx / Math.max(1, performance.now() - t0); // px/ms
      const largura = w();
      if (dx > largura * 0.35 || (v > 0.5 && dx > 40)) {
        const ms = Math.round(Math.max(140, Math.min(280, ((largura - dx) / largura) * 280)));
        pintar(largura, `transform ${ms}ms var(--ease-out), box-shadow ${ms}ms var(--ease-out)`);
        setTimeout(() => fn.current?.(), ms);
      } else {
        pintar(0, "transform var(--dur-std) var(--ease-out), box-shadow var(--dur-std) var(--ease-out)");
      }
    };
    el.addEventListener("touchstart", inicio, { passive: true });
    el.addEventListener("touchmove", mover, { passive: false });
    el.addEventListener("touchend", fim);
    el.addEventListener("touchcancel", fim);
    return () => {
      el.removeEventListener("touchstart", inicio);
      el.removeEventListener("touchmove", mover);
      el.removeEventListener("touchend", fim);
      el.removeEventListener("touchcancel", fim);
    };
  }, [ecraRef]);
}

// =====================================================================
//  Toque longo (500 ms). Antecipação: o elemento "levanta" (encolhe
//  ligeiramente) enquanto o dedo está pousado; ao disparar, haptic.
//  Um toque curto continua a ser um clique normal.
// =====================================================================
export function useToqueLongo(aoToqueLongo: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disparou = useRef(false);
  const origem = useRef({ x: 0, y: 0 });
  const el = useRef<HTMLElement | null>(null);

  const cancelar = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    el.current?.classList.remove("a-levantar");
  };
  return {
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      disparou.current = false;
      origem.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      el.current = e.currentTarget;
      e.currentTarget.classList.add("a-levantar");
      timer.current = setTimeout(() => {
        disparou.current = true;
        el.current?.classList.remove("a-levantar");
        vibrar("medio");
        aoToqueLongo();
      }, ms);
    },
    onTouchMove: (e: React.TouchEvent<HTMLElement>) => {
      const t = e.touches[0];
      if (Math.hypot(t.clientX - origem.current.x, t.clientY - origem.current.y) > 10) cancelar();
    },
    onTouchEnd: cancelar,
    onTouchCancel: cancelar,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    /** Usar no onClick: ignora o clique que se segue a um toque longo. */
    foiLongo: () => {
      const v = disparou.current;
      disparou.current = false;
      return v;
    },
  };
}
