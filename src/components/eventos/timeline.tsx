"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { agruparPorDia } from "@/lib/derivados";
import { cabecalhoDia } from "@/lib/formato";
import { usePathname } from "next/navigation";
import { temScrollGuardado } from "@/lib/gestos";
import { useColecao } from "@/lib/query/dados";
import type { Aquario, Condicionador, Evento } from "@/lib/tipos";
import { LinhaEvento } from "./linha-evento";

const PAGINA = 20;
/** Linhas montadas logo (enchem o ecrã); o resto entra num render diferido. */
const PRIMEIRAS = 8;

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
  // 1.º render só com as primeiras linhas (o ecrã entra já cheio durante a
  // transição); a lista completa chega num render interrompível, sem
  // tarefas longas. O valor inicial só é usado na montagem.
  // Ao voltar a um ecrã com scroll guardado, monta tudo de uma vez para a
  // posição ser reposta logo (como no iOS).
  const pathname = usePathname();
  const [inicio] = useState(() => (temScrollGuardado(pathname) ? eventosProp : eventosProp.slice(0, PRIMEIRAS)));
  const eventos = useDeferredValue(eventosProp, inicio);
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
