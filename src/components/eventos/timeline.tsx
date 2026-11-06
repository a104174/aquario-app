"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { agruparPorDia } from "@/lib/derivados";
import { cabecalhoDia } from "@/lib/formato";
import { useColecao } from "@/lib/query/dados";
import type { Aquario, Condicionador, Evento } from "@/lib/tipos";
import { LinhaEvento } from "./linha-evento";

const PAGINA = 20;
const VAZIO: Evento[] = [];

/** Timeline agrupada por dia, com render incremental (infinite scroll). */
export function Timeline({
  eventos: eventosProp,
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
  // Render concorrente (interrompível): com dados a chegar em várias
  // coleções, a lista não bloqueia o main thread em tarefas longas.
  // valor inicial [] → até a montagem é concorrente (o 1.º render é vazio
  // e a lista real entra num render interrompível, sem tarefas longas)
  const eventos = useDeferredValue(eventosProp, VAZIO);
  const [limite, setLimite] = useState(PAGINA);
  // uma só subscrição às fotos (antes era uma por linha)
  const fotos = useColecao("fotos").data;
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
          <h2 className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-text-2">
            {cabecalhoDia(g.data)}
          </h2>
          <div className="overflow-hidden rounded-[14px] bg-surface [&>div:last-child_button]:after:hidden">
            {g.eventos.map((e) => (
              <LinhaEvento
                key={`${e.tipo}-${e.id}`}
                evento={e}
                aquarios={aquarios}
                condicionadores={condicionadores}
                mostrarAquario={mostrarAquario}
                aquarioContexto={aquarioContexto}
                fotosTodas={fotos}
              />
            ))}
          </div>
        </section>
      ))}
      <div ref={fim} />
    </div>
  );
}
