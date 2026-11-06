"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FotoImg } from "@/components/eventos/foto-img";
import { IconMaisOpcoes } from "@/components/icons";
import { confirmar, escolher } from "@/components/ui/action-sheet";
import { cx } from "@/lib/cx";
import { vibrar } from "@/lib/haptic";
import { NOME_ETIQUETA } from "@/lib/fotos";
import { cabecalhoDia, hora, num } from "@/lib/formato";
import { useApagar, useColecao } from "@/lib/query/dados";
import { abrirRegistar } from "@/lib/ui-store";
import { fecharVisualizador, useVisualizador } from "@/lib/visualizador-store";
import type { Foto } from "@/lib/tipos";

const LIMIAR_FECHAR = 110; // px de arrasto para baixo

export function VisualizadorHost() {
  const estado = useVisualizador();
  const [montado, setMontado] = useState<typeof estado>(null);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (estado) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMontado(estado);
      setSaindo(false);
    } else if (montado) {
      // saída: 200ms ease-in, depois desmonta
      setSaindo(true);
      const t = setTimeout(() => setMontado(null), 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!montado || typeof document === "undefined") return null;
  return createPortal(<Visualizador ids={montado.ids} inicial={montado.indice} saindo={saindo} />, document.body);
}

function Visualizador({ ids, inicial, saindo }: { ids: string[]; inicial: number; saindo: boolean }) {
  const { data: todas = [] } = useColecao("fotos");
  const { data: aquarios } = useColecao("aquarios");
  const { data: tpas } = useColecao("tpas");
  const { data: fauna } = useColecao("fauna");
  const apagar = useApagar("fotos");
  const fotos = ids.map((id) => todas.find((f) => f.id === id)).filter(Boolean) as Foto[];
  const scroller = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(inicial);
  const [chrome, setChrome] = useState(true);
  const [arrasto, setArrasto] = useState(0);
  const arrastoRef = useRef(0);
  const [zoomAtivo, setZoomAtivo] = useState(false);
  const z = useRef({ s: 1, x: 0, y: 0 });
  type Toque = { tipo: "nada" | "talvez" | "pinca" | "pan" | "fechar" | "horizontal"; x0: number; y0: number; t0: number; d0: number; s0: number; zx: number; zy: number; cx: number; cy: number };
  const t = useRef<Toque>({ tipo: "nada", x0: 0, y0: 0, t0: 0, d0: 0, s0: 1, zx: 0, zy: 0, cx: 0, cy: 0 });
  const ultimoToque = useRef({ t: 0, x: 0, y: 0 });
  const timerToque = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = inicial * el.clientWidth;
  }, [inicial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fecharVisualizador();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (fotos.length === 0) fecharVisualizador();
  }, [fotos.length]);

  const atual = fotos[Math.min(indice, fotos.length - 1)];
  if (!atual) return null;
  const aquario = aquarios?.find((a) => a.id === atual.aquario_id);
  const ligado =
    atual.evento_tipo === "tpa"
      ? (() => {
          const t = tpas?.find((x) => x.id === atual.evento_id);
          return t ? `TPA de ${num(t.litros, 1)} L` : "TPA";
        })()
      : atual.evento_tipo === "fauna"
        ? (fauna?.find((x) => x.id === atual.evento_id)?.especie ?? "Fauna")
        : atual.evento_tipo === "medicao"
          ? "Medição"
          : null;

  async function menu() {
    const i = await escolher({ titulo: "Foto", opcoes: [{ texto: "Editar" }, { texto: "Apagar foto", destrutivo: true }] });
    if (i === 0) {
      fecharVisualizador();
      abrirRegistar({ tipo: "foto", editarId: atual.id, aquarioId: atual.aquario_id });
    }
    if (i === 1 && (await confirmar({ titulo: "Apagar esta foto?", acao: "Apagar foto", destrutivo: true }))) {
      apagar.mutate({ id: atual.id });
    }
  }

  // ------------------------------------------------------------------
  //  Gestos (touch events; estilo aplicado diretamente, sem re-render):
  //  pinça 1–4×, duplo toque 2,5× no ponto, arrastar com zoom, e sem
  //  zoom: swipe horizontal nativo (scroll-snap) e arrastar para baixo
  //  para fechar. Ao soltar, assenta com a curva de assinatura (280 ms).
  // ------------------------------------------------------------------
  const centro = () => {
    const r = scroller.current!.getBoundingClientRect();
    return { w: r.width, h: r.height, ox: r.left + r.width / 2, oy: r.top + r.height / 2 };
  };
  const slideAtual = () => scroller.current?.querySelector<HTMLElement>('[data-atual="true"]') ?? null;
  const aplicar = (animar: boolean) => {
    const el = slideAtual();
    if (!el) return;
    const { s: e, x, y } = z.current;
    el.style.transition = animar ? "transform var(--dur-std) var(--ease-out)" : "none";
    el.style.transform = e === 1 && !x && !y ? "" : `translate(${x}px, ${y}px) scale(${e})`;
  };
  const limitar = () => {
    const { w, h } = centro();
    const { s: e } = z.current;
    const mx = ((e - 1) * w) / 2;
    const my = ((e - 1) * h) / 2;
    z.current.x = Math.max(-mx, Math.min(mx, z.current.x));
    z.current.y = Math.max(-my, Math.min(my, z.current.y));
  };
  /** Zoom para `e`, mantendo o ponto (px, py) do ecrã debaixo do dedo. */
  const zoomPara = (e: number, px: number, py: number, base = z.current) => {
    const { ox, oy } = centro();
    const cx = px - ox;
    const cy = py - oy;
    const k = e / base.s;
    z.current = { s: e, x: cx - (cx - base.x) * k, y: cy - (cy - base.y) * k };
  };
  const repor = () => {
    z.current = { s: 1, x: 0, y: 0 };
    aplicar(true);
    setZoomAtivo(false);
  };
  /** Ao mudar de foto, a anterior volta ao tamanho normal. */
  const mudarIndice = (i: number) => {
    if (i === indice) return;
    setIndice(i);
    z.current = { s: 1, x: 0, y: 0 };
    setZoomAtivo(false);
    scroller.current?.querySelectorAll<HTMLElement>("[data-slide]").forEach((el) => (el.style.transform = ""));
  };

  const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    const g = t.current;
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      Object.assign(g, { tipo: "pinca", d0: dist(a, b), s0: z.current.s, zx: z.current.x, zy: z.current.y, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2 });
      if (timerToque.current) clearTimeout(timerToque.current);
      return;
    }
    if (e.touches.length !== 1) return;
    const p = e.touches[0];
    Object.assign(g, { tipo: z.current.s > 1 ? "pan" : "talvez", x0: p.clientX, y0: p.clientY, t0: performance.now(), zx: z.current.x, zy: z.current.y });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const g = t.current;
    if (g.tipo === "pinca" && e.touches.length >= 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const escala = Math.max(0.85, Math.min(4, (g.s0 * dist(a, b)) / g.d0));
      const mx = (a.clientX + b.clientX) / 2;
      const my = (a.clientY + b.clientY) / 2;
      zoomPara(escala, g.cx, g.cy, { s: g.s0, x: g.zx, y: g.zy });
      z.current.x += mx - g.cx;
      z.current.y += my - g.cy;
      aplicar(false);
      return;
    }
    const p = e.touches[0];
    if (!p) return;
    const dx = p.clientX - g.x0;
    const dy = p.clientY - g.y0;
    if (g.tipo === "pan") {
      z.current.x = g.zx + dx;
      z.current.y = g.zy + dy;
      aplicar(false);
    } else if (g.tipo === "talvez" && Math.hypot(dx, dy) > 8) {
      g.tipo = dy > Math.abs(dx) ? "fechar" : "horizontal";
    }
    if (g.tipo === "fechar") {
      arrastoRef.current = Math.max(0, dy);
      setArrasto(arrastoRef.current);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const g = t.current;
    if (g.tipo === "pinca") {
      if (e.touches.length === 1) {
        // um dedo levantou: continua como arrastar
        const p = e.touches[0];
        Object.assign(g, { tipo: "pan", x0: p.clientX, y0: p.clientY, zx: z.current.x, zy: z.current.y });
        return;
      }
      if (z.current.s < 1.05) repor();
      else {
        limitar();
        aplicar(true);
        setZoomAtivo(true);
      }
      g.tipo = "nada";
      return;
    }
    if (g.tipo === "pan") {
      limitar();
      aplicar(true);
    } else if (g.tipo === "fechar") {
      if (arrastoRef.current > LIMIAR_FECHAR) fecharVisualizador();
      arrastoRef.current = 0;
      setArrasto(0);
    }
    // Toque: duplo toque faz zoom; toque simples mostra/esconde a interface
    const p = e.changedTouches[0];
    const curto = performance.now() - g.t0 < 300 && p && Math.hypot(p.clientX - g.x0, p.clientY - g.y0) < 10;
    if ((g.tipo === "talvez" || g.tipo === "pan") && curto) {
      const agora = performance.now();
      const u = ultimoToque.current;
      if (agora - u.t < 320 && Math.hypot(p.clientX - u.x, p.clientY - u.y) < 30) {
        if (timerToque.current) clearTimeout(timerToque.current);
        ultimoToque.current = { t: 0, x: 0, y: 0 };
        if (z.current.s > 1) repor();
        else {
          zoomPara(2.5, p.clientX, p.clientY);
          limitar();
          aplicar(true);
          setZoomAtivo(true);
          vibrar("leve");
        }
      } else {
        ultimoToque.current = { t: agora, x: p.clientX, y: p.clientY };
        timerToque.current = setTimeout(() => setChrome((c) => !c), 300);
      }
    }
    g.tipo = "nada";
  };

  const progresso = Math.min(1, arrasto / 300);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Fotografia"
      className={cx("fixed inset-0 z-[90] select-none", saindo ? "viewer-exit" : "viewer-enter")}
      style={{ backgroundColor: `rgb(0 0 0 / ${1 - progresso * 0.7})` }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        ref={scroller}
        onScroll={(e) => mudarIndice(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="scroll-area flex h-full w-full snap-x snap-mandatory overflow-y-hidden"
        style={{
          transform: `translateY(${arrasto}px) scale(${1 - progresso * 0.12})`,
          transition: arrasto ? "none" : "transform var(--dur-std) var(--ease-out)",
          // com zoom, os gestos são nossos (sem scroll nativo entre fotos)
          touchAction: zoomAtivo ? "none" : "pan-x",
          overflowX: zoomAtivo ? "hidden" : "auto",
        }}
      >
        {fotos.map((f, i) => (
          <div key={f.id} data-slide data-atual={i === indice} className="relative h-full w-full shrink-0 snap-center will-change-transform">
            <FotoImg foto={f} contain className="h-full w-full !bg-transparent" alt={f.legenda ?? ""} />
          </div>
        ))}
      </div>

      {/* Barra superior */}
      <div
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-2 pb-6 pt-[var(--safe-top)] text-white",
          "transition-opacity duration-[var(--dur-std)] ease-[var(--ease-out)]",
          chrome && !arrasto ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="pointer-events-auto flex h-11 items-center justify-between">
          <button type="button" onClick={fecharVisualizador} className="pressable h-11 rounded-lg px-3 text-[17px] font-semibold">
            Fechar
          </button>
          <span className="text-[15px] tabular-nums text-white/80">
            {Math.min(indice, fotos.length - 1) + 1} de {fotos.length}
          </span>
          <button type="button" aria-label="Opções" onClick={menu} className="pressable flex h-11 w-11 items-center justify-center rounded-full">
            <IconMaisOpcoes size={26} />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div
        className={cx(
          "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-[calc(var(--safe-bottom)+16px)] pt-10 text-white",
          "transition-opacity duration-[var(--dur-std)] ease-[var(--ease-out)]",
          chrome && !arrasto ? "opacity-100" : "opacity-0",
        )}
      >
        <div key={atual.id} className="enter-up">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="rounded-full bg-white/20 px-2 py-0.5">{NOME_ETIQUETA[atual.etiqueta] ?? "Outro"}</span>
            {ligado && <span className="rounded-full bg-white/20 px-2 py-0.5">{ligado}</span>}
          </div>
          {atual.legenda && <p className="selectable text-[17px]">{atual.legenda}</p>}
          <p className="text-[13px] text-white/70">
            {aquario?.nome} · {cabecalhoDia(atual.data)}, {hora(atual.data)}
          </p>
        </div>
      </div>
    </div>
  );
}
