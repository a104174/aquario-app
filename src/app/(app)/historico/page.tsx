"use client";

import { Mascote } from "@/components/mascote/mascote";
import { EstadoErro } from "@/components/ui/estado-erro";
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
        // enquanto os aquários carregam, reserva a altura dos chips (CLS = 0)
        aquarios.isPending ? (
          <div className="mt-4 h-11" aria-hidden />
        ) : (aquarios.data?.length ?? 0) > 1 && (
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
      {tpas.isError && !tpas.data ? (
        <EstadoErro onRetry={() => void tpas.refetch()} aTentar={tpas.isFetching} />
      ) : tpas.isPending || aquarios.isPending ? (
        <div className="skeleton-delay">
          <SkeletonLista linhas={7} />
        </div>
      ) : eventos.length === 0 ? (
        <div className="enter-up flex flex-col items-center px-4 py-8 text-center">
          <Mascote humor="contente" tamanho={112} entrar className="mb-2" />
          <p className="text-title3 font-semibold">O diário está em branco</p>
          <p className="mt-1 max-w-xs text-subhead text-text-2">
            Toca em <span className="font-semibold text-accent-forte">+</span> na barra de baixo para registar a primeira TPA ou medição.
          </p>
        </div>
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
