"use client";

import { useEffect, useRef, useState } from "react";
import { agruparPorDia } from "@/lib/derivados";
import { cabecalhoDia } from "@/lib/formato";
import type { Aquario, Condicionador, Evento } from "@/lib/tipos";
import { LinhaEvento } from "./linha-evento";

const PAGINA = 40;

/** Timeline agrupada por dia, com render incremental (infinite scroll). */
export function Timeline({
  eventos,
  aquarios,
  condicionadores,
  mostrarAquario,
  aquarioContexto,
}: {
  eventos: Evento[];
  aquarios?: Aquario[];
  condicionadores?: Condicionador[];
  mostrarAquario?: boolean;
  aquarioContexto?: string;
}) {
  const [limite, setLimite] = useState(PAGINA);
  const fim = useRef<HTMLDivElement>(null);
  const grupos = agruparPorDia(eventos.slice(0, limite));

  useEffect(() => {
    const el = fim.current;
    if (!el || limite >= eventos.length) return;
    const io = new IntersectionObserver(
      (e) => e[0]?.isIntersecting && setLimite((l) => l + PAGINA),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [limite, eventos.length]);

  return (
    <div>
      {grupos.map((g, gi) => (
        <section key={g.dia} className="enter-up mb-5" style={{ ["--i" as string]: Math.min(gi, 6) }}>
          <h3 className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-text-2">
            {cabecalhoDia(g.data)}
          </h3>
          <div className="overflow-hidden rounded-[14px] bg-surface [&>div:last-child_button]:after:hidden">
            {g.eventos.map((e) => (
              <LinhaEvento
                key={`${e.tipo}-${e.id}`}
                evento={e}
                aquarios={aquarios}
                condicionadores={condicionadores}
                mostrarAquario={mostrarAquario}
                aquarioContexto={aquarioContexto}
              />
            ))}
          </div>
        </section>
      ))}
      <div ref={fim} />
    </div>
  );
}
