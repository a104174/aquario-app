"use client";

import { useMemo, useState } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { Chips } from "@/components/forms/campos";
import { IconCamara } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { agruparPorDia } from "@/lib/derivados";
import { ETIQUETAS } from "@/lib/fotos";
import { cabecalhoDia } from "@/lib/formato";
import { useColecao } from "@/lib/query/dados";
import { abrirRegistar } from "@/lib/ui-store";
import { abrirVisualizador } from "@/lib/visualizador-store";
import type { EtiquetaFoto } from "@/lib/tipos";

type Filtro = EtiquetaFoto | "todas";

/** Grelha de fotos de um aquário, agrupada por dia, com filtro por etiqueta. */
export function Galeria({ aquarioId }: { aquarioId: string }) {
  const { data: fotos = [] } = useColecao("fotos");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const doAquario = useMemo(() => fotos.filter((f) => f.aquario_id === aquarioId), [fotos, aquarioId]);
  const filtradas = useMemo(
    () => (filtro === "todas" ? doAquario : doAquario.filter((f) => f.etiqueta === filtro)),
    [doAquario, filtro],
  );
  const grupos = useMemo(
    () => agruparPorDia(filtradas.map((f) => ({ tipo: "foto" as const, id: f.id, aquario_id: f.aquario_id, data: f.data, item: f }))),
    [filtradas],
  );
  const ids = filtradas.map((f) => f.id);
  const contagem = (e: EtiquetaFoto) => doAquario.filter((f) => f.etiqueta === e).length;

  return (
    <div>
      <Button variant="secondary" block className="mb-4" onClick={() => abrirRegistar({ tipo: "foto", aquarioId })}>
        <IconCamara size={20} /> Adicionar foto
      </Button>

      {doAquario.length > 0 && (
        <div className="mb-4">
          <Chips
            opcoes={[
              { valor: "todas" as Filtro, texto: `Todas · ${doAquario.length}` },
              ...ETIQUETAS.filter((e) => contagem(e.valor) > 0).map((e) => ({ valor: e.valor as Filtro, texto: `${e.texto} · ${contagem(e.valor)}` })),
            ]}
            valor={filtro}
            onValor={setFiltro}
          />
        </div>
      )}

      {filtradas.length === 0 ? (
        <p className="enter-up rounded-[14px] bg-surface px-4 py-8 text-center text-text-2">
          {doAquario.length ? "Sem fotos com esta etiqueta." : "Ainda não há fotos deste aquário."}
        </p>
      ) : (
        <div key={filtro} className="step-forward">
          {grupos.map((g) => (
            <section key={g.dia} className="mb-5">
              <h2 className="mb-1.5 px-1 text-footnote font-semibold uppercase tracking-wide text-text-2">{cabecalhoDia(g.data)}</h2>
              <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-[14px]">
                {g.eventos.map((e, i) => (
                  <button
                    key={e.id}
                    type="button"
                    aria-label="Abrir foto"
                    onClick={() => abrirVisualizador(ids, ids.indexOf(e.id))}
                    style={{ ["--i" as string]: Math.min(i, 6) }}
                    className="pressable enter-up aspect-square"
                  >
                    {e.tipo === "foto" && <FotoImg foto={e.item} thumb className="h-full w-full" />}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
