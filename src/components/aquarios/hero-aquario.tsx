"use client";

import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { IconCamara } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { abrirVisualizador } from "@/lib/visualizador-store";
import type { Aquario, Foto } from "@/lib/tipos";

type Props = Omit<ComponentProps<typeof Screen>, "hero" | "fundoHero"> & {
  aquario: Aquario;
  /** Fotografias deste aquário, das mais recentes para as mais antigas. */
  fotos: Foto[];
  indicadores: ReactNode;
};

export function HeroAquario({ aquario, fotos, indicadores, ...screen }: Props) {
  const faixa = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState<{ chave: string; indice: number }>();
  const capa = fotos.find((f) => f.id === aquario.foto_capa_id);
  const ordenadas = capa ? [capa, ...fotos.filter((f) => f.id !== capa.id)] : fotos;
  const slides = ordenadas.slice(0, 5);
  const chave = `${aquario.id}:${slides.map((f) => f.id).join(":")}`;
  const atual = posicao?.chave === chave ? Math.min(posicao.indice, slides.length - 1) : 0;

  if (!slides.length) return (
    <Screen {...screen} hero={
      <div data-claro="" className="group/ind relative mt-4">
        <div className="relative grid grid-cols-3 gap-2">{indicadores}</div>
      </div>
    } />
  );

  return (
    <Screen {...screen}
      fundoHero={
        <div key={chave} className="absolute inset-0">
          <div ref={faixa} role="group" aria-label="Fotografias do aquário"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (!el.clientWidth) return;
              const indice = Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
              setPosicao((p) => p?.chave === chave && p.indice === indice ? p : { chave, indice });
            }}
            className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
            {slides.map((foto, i) => (
              <button key={foto.id} type="button" tabIndex={i === atual ? 0 : -1} aria-hidden={i !== atual}
                aria-label={`Abrir fotografia ${i + 1} do aquário${foto.legenda ? ` · ${foto.legenda}` : ""}`}
                onClick={() => abrirVisualizador(ordenadas.map((f) => f.id), i)}
                className="relative isolate block h-full w-full shrink-0 snap-start snap-always overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white">
                {(i === atual || (foto.thumb_path && Math.abs(i - atual) === 1)) &&
                  <FotoImg foto={foto} thumb className="h-full w-full !bg-[#0b2533]" />}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(3_14_21/.86)_0%,rgb(3_14_21/.60)_19%,rgb(3_14_21/.08)_34%,rgb(3_14_21/.65)_49%,rgb(3_14_21/.82)_73%,rgb(3_14_21/.94)_100%)]" />
                <span aria-hidden="true" className="pointer-events-none absolute right-[max(20px,calc(var(--safe-right)+8px))] top-[calc(var(--safe-top)+53px)] grid size-8 place-items-center rounded-full border border-white/20 bg-[#071219]/60 text-white [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
                  <IconCamara size={17} />
                </span>
              </button>
            ))}
          </div>
        </div>
      }
      hero={
        <div className="mt-3">
          <div className="group/ind grid grid-cols-3 gap-2">{indicadores}</div>
          {slides.length > 1 && (
            <div className="flex items-center justify-center" role="group" aria-label="Paginação das fotografias">
              {slides.map((foto, i) => (
                <button key={foto.id} type="button" aria-current={i === atual ? "true" : undefined}
                  aria-label={`Mostrar fotografia ${i + 1} de ${slides.length}`}
                  onClick={() => {
                    const el = faixa.current;
                    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
                  }}
                  className="pointer-events-auto grid size-11 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-white">
                  <span className={`h-1 rounded-full transition-[width,background-color] motion-reduce:transition-none ${i === atual ? "w-6 bg-[#83e4eb]" : "w-2.5 bg-white/55"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}
