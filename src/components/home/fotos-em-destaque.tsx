"use client";

import { useEffect, useRef, useState } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { IconCamara } from "@/components/icons";
import { dataCurta } from "@/lib/formato";
import { abrirVisualizador } from "@/lib/visualizador-store";
import type { Aquario, Foto } from "@/lib/tipos";

export function FotosEmDestaque({ fotos, aquarios }: { fotos: Foto[]; aquarios: Aquario[] }) {
  const recentes = fotos.slice(0, 5);
  const n = recentes.length;
  const faixa = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const indice = Math.min(atual, Math.max(0, n - 1));

  useEffect(() => {
    const el = faixa.current;
    if (!el || n < 2 || pausa) return;
    let visivel = false;
    const observer = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }, { threshold: 0.5 });
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    observer.observe(el);
    const timer = window.setInterval(() => {
      if (!visivel || document.hidden || movimento.matches || el.matches(":focus-within, :hover")) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: (i + 1) % n * el.clientWidth, behavior: i === n - 1 ? "instant" : "smooth" });
    }, 7500);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, [n, pausa]);

  return (
    <section aria-labelledby="inicio-memorias">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id="inicio-memorias" className="mare-seccao !mb-0">Memórias recentes</h2>
        <span className="pr-1 text-[12px] text-text-2">{fotos.length} {fotos.length === 1 ? "fotografia" : "fotografias"}</span>
      </div>
      {n === 0 ? (
        <div className="mare-superficie flex min-h-20 items-center gap-3 rounded-[20px] px-4 text-[14px] text-text-2">
          <IconCamara className="text-accent" size={21} /> As fotografias que registares aparecem aqui.
        </div>
      ) : (
        <div className="mare-superficie overflow-hidden rounded-[24px]">
          <div
            ref={faixa}
            className="mare-album flex snap-x snap-mandatory overflow-x-auto"
            onPointerDown={() => setPausa(true)}
            onScroll={(e) => {
              const el = e.currentTarget;
              setAtual(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {recentes.map((foto, i) => {
              const nome = aquarios.find((a) => a.id === foto.aquario_id)?.nome ?? "Aquário";
              return (
                <button
                  key={foto.id}
                  type="button"
                  tabIndex={i === indice ? 0 : -1}
                  aria-hidden={i !== indice}
                  aria-label={`Abrir fotografia de ${nome} · ${dataCurta(foto.data)}`}
                  onClick={() => { setPausa(true); abrirVisualizador(recentes.map((f) => f.id), i); }}
                  className="relative isolate block h-[clamp(200px,56vw,278px)] w-full shrink-0 snap-start snap-always text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
                >
                  <div className="absolute inset-0 -z-10">
                    <FotoImg foto={foto} thumb className="h-full w-full" alt="" />
                  </div>
                  <span className="absolute inset-0 bg-gradient-to-t from-[#031018]/95 via-[#031018]/25 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 px-4 pb-4 text-white">
                    <span className="block text-[11px] font-semibold uppercase tracking-[.15em] text-white/80">{dataCurta(foto.data)}</span>
                    <span className="mt-1 block text-[22px] font-semibold leading-tight tracking-tight">{nome}</span>
                    {foto.legenda && <span className="block truncate text-[13px] text-white/85">{foto.legenda}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {n > 1 && (
            <div className="flex items-center justify-between gap-1 px-2">
              <span className="shrink-0 pl-1 text-[12px] tabular-nums text-text-2" aria-label={`Fotografia ${indice + 1} de ${n}`}>{indice + 1} / {n}</span>
              <div className="flex justify-center" role="group" aria-label="Escolher fotografia">
                {recentes.map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-label={`Fotografia ${i + 1}`}
                    aria-current={i === indice ? "true" : undefined}
                    className="grid size-11 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-accent"
                    onClick={() => {
                      setPausa(true);
                      const el = faixa.current;
                      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
                    }}
                  >
                    <span className={`h-1 rounded-full transition-[width,background-color] motion-reduce:transition-none ${i === indice ? "w-7 bg-accent" : "w-4 bg-text-3/50"}`} />
                  </button>
                ))}
              </div>
              <button type="button" aria-label={pausa ? "Retomar rotação" : "Pausar rotação"} onClick={() => setPausa((p) => !p)} className="grid size-11 shrink-0 place-items-center rounded-lg text-text-2 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hidden">
                <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden="true">
                  {pausa ? <path d="M6 3.5 16 10 6 16.5Z" /> : <path d="M5 4h3.5v12H5zm6.5 0H15v12h-3.5z" />}
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
