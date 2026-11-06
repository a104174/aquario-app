"use client";

import { useEffect, useMemo, useState } from "react";
import { Chips } from "@/components/forms/campos";
import { Timeline } from "@/components/eventos/timeline";
import { Screen } from "@/components/shell/screen";
import { SkeletonLista } from "@/components/ui/skeleton";
import { juntarEventos } from "@/lib/derivados";
import { plural } from "@/lib/formato";
import { useColecao } from "@/lib/query/dados";

const FILTRO_KEY = "aquario-filtro-historico";
const TODOS = "todos";

export default function HistoricoPage() {
  const aquarios = useColecao("aquarios");
  const tpas = useColecao("tpas");
  const medicoes = useColecao("medicoes").data;
  const fauna = useColecao("fauna").data;
  const fotos = useColecao("fotos").data;
  const condicionadores = useColecao("produtos").data;
  const [filtro, setFiltro] = useState<string>(TODOS);

  useEffect(() => {
    try {
      const f = sessionStorage.getItem(FILTRO_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (f) setFiltro(f);
    } catch {}
  }, []);

  function mudar(f: string) {
    setFiltro(f);
    try {
      sessionStorage.setItem(FILTRO_KEY, f);
    } catch {}
  }

  const ativo = filtro === TODOS || aquarios.data?.some((a) => a.id === filtro) ? filtro : TODOS;
  const eventos = useMemo(
    () =>
      juntarEventos(
        { tpas: tpas.data, medicoes, fauna, fotos },
        ativo === TODOS
          ? undefined
          : (aq, e) => aq === ativo || (e as { aquario_destino_id?: string }).aquario_destino_id === ativo,
      ),
    [tpas.data, medicoes, fauna, fotos, ativo],
  );

  return (
    <Screen
      titulo="Histórico"
      subtitulo={tpas.data ? plural(eventos.length, "registo", "registos") : " "}
      hero={
        (aquarios.data?.length ?? 0) > 1 && (
          <div className="mt-4">
            <Chips
              escuro
              opcoes={[{ valor: TODOS, texto: "Todos" }, ...(aquarios.data ?? []).map((a) => ({ valor: a.id, texto: a.nome }))]}
              valor={ativo}
              onValor={mudar}
            />
          </div>
        )
      }
    >
      {tpas.isPending || aquarios.isPending ? (
        <div className="skeleton-delay">
          <SkeletonLista linhas={7} />
        </div>
      ) : eventos.length === 0 ? (
        <p className="enter-up rounded-[14px] bg-surface px-4 py-10 text-center text-text-2">
          Ainda não há registos. Toca em <span className="font-semibold text-accent">Registar</span> para começar.
        </p>
      ) : (
        <div key={ativo} className="step-forward">
          <Timeline
            eventos={eventos}
            aquarios={aquarios.data}
            condicionadores={condicionadores}
            mostrarAquario={ativo === TODOS}
            aquarioContexto={ativo === TODOS ? undefined : ativo}
          />
        </div>
      )}
    </Screen>
  );
}
