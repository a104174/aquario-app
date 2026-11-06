"use client";

import { FotoImg } from "@/components/eventos/foto-img";
import { IconChevronDireita, IconPeixe } from "@/components/icons";
import { Seccao } from "@/components/shell/screen";
import { escolher } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { faunaAtual } from "@/lib/derivados";
import { gruposFauna, nomeGrupoFauna, type GrupoFauna } from "@/lib/fauna-grupos";
import { plural } from "@/lib/formato";
import type { FaunaEvento, Foto } from "@/lib/tipos";
import { abrirRegistar } from "@/lib/ui-store";
import { abrirVisualizador } from "@/lib/visualizador-store";

export function FaunaAquario({ id, fauna, fotos }: { id: string; fauna?: FaunaEvento[]; fotos?: Foto[] }) {
  const grupos = gruposFauna(fauna, id);
  const resumo = faunaAtual(fauna, id);

  async function menu(g: GrupoFauna) {
    const titulo = g.origem ? nomeGrupoFauna(g.origem) : g.especie;
    const i = await escolher({
      titulo,
      mensagem: `${plural(g.quantidade, "animal", "animais")}${g.origem?.notas ? ` · ${g.origem.notas}` : ""}`,
      opcoes: [
        { texto: g.origem ? "Editar identificação e foto" : "Detalhar animais deste grupo" },
        { texto: "Registar saída, morte ou transferência" },
      ],
    });
    if (i === 0 && g.origem) abrirRegistar({ tipo: "fauna", aquarioId: g.origem.aquario_id, editarId: g.origem.id });
    if (i === 0 && !g.origem) abrirRegistar({ tipo: "fauna", aquarioId: id, faunaContexto: { especie: g.especie, detalhar: true } });
    if (i === 1) abrirRegistar({ tipo: "fauna", aquarioId: id, faunaContexto: { especie: g.especie, grupoId: g.origem?.id } });
  }

  return (
    <Seccao titulo="Fauna no aquário">
      {grupos.length ? (
        <>
          <p className="mb-2 px-1 text-[13px] text-text-2">{plural(resumo.total, "animal", "animais")} · {plural(resumo.lista.length, "espécie", "espécies")}</p>
          <ul className="space-y-1.5">
            {grupos.map((g) => {
              const titulo = g.origem ? nomeGrupoFauna(g.origem) : g.especie;
              const foto = fotos?.find((f) => f.id === g.origem?.foto_destaque_id);
              return (
                <li key={g.origem?.id ?? g.especie} className="flex items-center gap-2 rounded-[16px] border border-separator bg-surface pl-2">
                  {foto ? (
                    <button type="button" onClick={() => abrirVisualizador([foto.id], 0)} aria-label={`Ver fotografia de ${titulo}`}
                      className="pressable size-12 shrink-0 overflow-hidden rounded-[11px]">
                      <FotoImg foto={foto} thumb className="h-full w-full" />
                    </button>
                  ) : (
                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[11px] border border-separator bg-accent-soft text-accent">
                      <IconPeixe size={23} />
                    </span>
                  )}
                  <button type="button" onClick={() => void menu(g)} className="pressable flex min-h-[66px] min-w-0 flex-1 items-center gap-2 py-2 pr-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-tight">{titulo}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-text-2">
                        {g.origem?.notas || (g.origem ? "Grupo identificado" : "Grupo genérico")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-surface-2 px-1.5 py-1 text-[14px] font-semibold tabular-nums">×{g.quantidade}</span>
                    <IconChevronDireita size={15} className="shrink-0 text-text-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : <p className="rounded-[14px] bg-surface px-4 py-6 text-center text-text-2">{fauna ? "Sem fauna registada." : "A carregar fauna…"}</p>}
      <Button variant="secondary" block className="mt-3" onClick={() => abrirRegistar({ tipo: "fauna", aquarioId: id })}>
        Registar evento de fauna
      </Button>
    </Seccao>
  );
}
