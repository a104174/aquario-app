"use client";

import { useRef, useState, type ReactNode } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { IconCamara } from "@/components/icons";
import { abrirVisualizador } from "@/lib/visualizador-store";
import type { Aquario, Foto } from "@/lib/tipos";

export function HeroAquario({ aquario, fotos, children }: { aquario: Aquario; fotos?: Foto[]; children: ReactNode }) {
  const faixa = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const galeria = fotos?.filter((f) => f.aquario_id === aquario.id) ?? [];
  const capa = galeria.find((f) => f.id === aquario.foto_capa_id);
  const ordenadas = capa ? [capa, ...galeria.filter((f) => f.id !== capa.id)] : galeria;
  const slides = ordenadas.slice(0, 5);
  const atual = Math.min(indice, Math.max(0, slides.length - 1));

  if (!slides.length) return (
    <div className="relative mt-4 overflow-hidden rounded-[18px] border border-white/15 bg-white/5 p-2">
      <svg viewBox="0 0 180 72" className="pointer-events-none absolute -right-1 top-0 h-full w-[55%] text-[#78d9e4]/20" fill="none" aria-hidden="true">
        <path d="M-10 30c36 4 50-22 91-22 43 0 55 30 99 30M-10 45c36 4 50-22 91-22 43 0 55 30 99 30M-10 60c36 4 50-22 91-22 43 0 55 30 99 30" stroke="currentColor" />
      </svg>
      <div className="relative grid grid-cols-3 gap-1">{children}</div>
    </div>
  );

  return (
    <div className="mt-3 overflow-hidden rounded-[19px] border border-white/15 bg-[#0e2632]">
      <div ref={faixa} role="group" aria-label="Fotografias do aquário"
        onScroll={(e) => { const el = e.currentTarget; if (el.clientWidth) setIndice(Math.round(el.scrollLeft / el.clientWidth)); }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        {slides.map((foto, i) => (
          <button key={foto.id} type="button" tabIndex={i === atual ? 0 : -1} aria-hidden={i !== atual}
            aria-label={`Abrir fotografia ${i + 1} do aquário${foto.legenda ? ` · ${foto.legenda}` : ""}`}
            onClick={() => abrirVisualizador(ordenadas.map((f) => f.id), i)}
            className="relative isolate block h-[clamp(112px,32vw,158px)] w-full shrink-0 snap-start snap-always overflow-hidden bg-surface-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white">
            {(i === atual || (foto.thumb_path && Math.abs(i - atual) === 1)) && <FotoImg foto={foto} thumb className="h-full w-full" />}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-5 text-[11px] font-semibold text-white">
              <span className="truncate">{i === 0 ? "Capa do aquário" : foto.legenda || "Galeria do aquário"}</span>
              <IconCamara size={16} className="shrink-0" />
            </span>
          </button>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center px-2" role="group" aria-label="Paginação das fotografias">
          {slides.map((foto, i) => (
            <button key={foto.id} type="button" aria-current={i === atual ? "true" : undefined}
              aria-label={`Mostrar fotografia ${i + 1} de ${slides.length}`}
              onClick={() => {
                const el = faixa.current;
                if (el) el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
              }}
              className="grid size-11 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-white">
              <span className={`h-1 rounded-full transition-[width,background-color] motion-reduce:transition-none ${i === atual ? "w-6 bg-[#83e4eb]" : "w-2.5 bg-white/35"}`} />
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 border-t border-white/10 p-1.5">{children}</div>
    </div>
  );
}
