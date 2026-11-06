"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FotoImg } from "@/components/eventos/foto-img";
import { IconMaisOpcoes } from "@/components/icons";
import { confirmar, escolher } from "@/components/ui/action-sheet";
import { cx } from "@/lib/cx";
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
  const inicio = useRef<{ x: number; y: number; vertical: boolean | null } | null>(null);

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

  // Arrastar para baixo para fechar (só quando o gesto é vertical)
  const onPointerDown = (e: React.PointerEvent) => {
    inicio.current = { x: e.clientX, y: e.clientY, vertical: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = inicio.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.vertical === null && Math.hypot(dx, dy) > 8) s.vertical = Math.abs(dy) > Math.abs(dx) && dy > 0;
    if (s.vertical) setArrasto(Math.max(0, dy));
  };
  const onPointerUp = () => {
    const s = inicio.current;
    inicio.current = null;
    if (s?.vertical && arrasto > LIMIAR_FECHAR) fecharVisualizador();
    else if (s?.vertical === null) setChrome((c) => !c); // toque simples
    setArrasto(0);
  };

  const progresso = Math.min(1, arrasto / 300);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Fotografia"
      className={cx("fixed inset-0 z-[90] touch-none select-none", saindo ? "viewer-exit" : "viewer-enter")}
      style={{ backgroundColor: `rgb(0 0 0 / ${1 - progresso * 0.7})` }}
    >
      <div
        ref={scroller}
        onScroll={(e) => setIndice(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="scroll-area flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        style={{
          transform: `translateY(${arrasto}px) scale(${1 - progresso * 0.12})`,
          transition: arrasto ? "none" : "transform var(--dur-std) var(--ease-out)",
          touchAction: "pan-x",
        }}
      >
        {fotos.map((f) => (
          <div key={f.id} className="relative h-full w-full shrink-0 snap-center">
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
