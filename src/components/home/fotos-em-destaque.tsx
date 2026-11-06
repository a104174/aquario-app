"use client";

import { useEffect, useMemo, useState } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { abrirVisualizador } from "@/lib/visualizador-store";
import type { Aquario, Foto } from "@/lib/tipos";

export function FotosEmDestaque({ fotos, aquarios }: { fotos: Foto[]; aquarios: Aquario[] }) {
  const recentes = useMemo(() => fotos.slice(0, 5), [fotos]);
  const [indiceEscolhido, setIndice] = useState(0);
  const indice = Math.min(indiceEscolhido, Math.max(0, recentes.length - 1));

  useEffect(() => {
    if (recentes.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndice((i) => (i + 1) % recentes.length), 6500);
    return () => window.clearInterval(id);
  }, [recentes.length]);

  if (!recentes.length) return null;
  const foto = recentes[indice];
  const aquario = aquarios.find((a) => a.id === foto.aquario_id);
  const ids = recentes.map((f) => f.id);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-2">Memórias recentes</h2>
        <span className="text-[12px] text-text-3">{indice + 1}/{recentes.length}</span>
      </div>
      <div className="overflow-hidden rounded-[18px] bg-surface shadow-[var(--shadow-card)]">
        <button
          type="button"
          aria-label={`Abrir fotografia${aquario ? ` de ${aquario.nome}` : ""}`}
          onClick={() => abrirVisualizador(ids, indice)}
          className="pressable relative block h-40 w-full text-left"
        >
          <FotoImg key={foto.id} foto={foto} thumb className="h-full w-full" alt={foto.legenda ?? aquario?.nome ?? "Fotografia do aquário"} />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-white">
            <span className="block text-[15px] font-semibold">{aquario?.nome ?? "Aquário"}</span>
            {foto.legenda && <span className="block truncate text-[13px] text-white/80">{foto.legenda}</span>}
          </span>
        </button>
        {recentes.length > 1 && (
          <div className="flex h-8 items-center justify-center gap-1.5" aria-label="Escolher fotografia">
            {recentes.map((f, i) => (
              <button
                key={f.id}
                type="button"
                aria-label={`Fotografia ${i + 1}`}
                aria-current={i === indice}
                onClick={() => setIndice(i)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span
                  className={`h-2 rounded-full transition-[width,background-color] duration-[var(--dur-std)] ${
                    i === indice ? "w-5 bg-accent" : "w-2 bg-surface-3"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
