"use client";

import { FotoImg } from "@/components/eventos/foto-img";
import { FaunaSemFoto } from "@/components/aquarium-visual-kit/icone-aquario";
import { IconChevronDireita } from "@/components/icons";
import { tipoFaunaPorNome } from "@/lib/fauna-tipo";
import { Seccao } from "@/components/shell/screen";
import { confirmar, escolher } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { faunaAtual } from "@/lib/derivados";
import { chaveEspecie, gruposFauna, nomeGrupoFauna, type GrupoFauna } from "@/lib/fauna-grupos";
import { vibrar } from "@/lib/haptic";
import { useApagar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import { plural } from "@/lib/formato";
import type { FaunaEvento, Foto } from "@/lib/tipos";
import { abrirRegistar } from "@/lib/ui-store";
import { abrirVisualizador } from "@/lib/visualizador-store";

export function FaunaAquario({ id, fauna, fotos }: { id: string; fauna?: FaunaEvento[]; fotos?: Foto[] }) {
  const grupos = gruposFauna(fauna, id);
  const resumo = faunaAtual(fauna, id);
  const apagar = useApagar("fauna");

  /**
   * Registos a apagar quando o grupo foi criado por engano (não é morte,
   * saída nem transferência: é como se nunca tivesse existido).
   * - Grupo próprio (entrada/nascimento identificado): o registo que o criou
   *   e os que lhe estão ligados.
   * - Grupo genérico ou identificação: todos os registos desta espécie
   *   neste aquário. Transferências PARA outros aquários ficam (são
   *   história do outro aquário).
   */
  function registosDoGrupo(g: GrupoFauna) {
    const eventos = fauna ?? [];
    if (g.origem && g.origem.tipo !== "detalhe") {
      return eventos.filter((e) => e.id === g.origem!.id || e.grupo_id === g.origem!.id);
    }
    const chave = chaveEspecie(g.especie);
    return eventos.filter(
      (e) => e.aquario_id === id && chaveEspecie(e.especie) === chave && !(e.tipo === "transferencia" && e.aquario_destino_id && e.aquario_destino_id !== id),
    );
  }

  async function apagarGrupo(g: GrupoFauna) {
    const titulo = g.origem ? nomeGrupoFauna(g.origem) : g.especie;
    const registos = registosDoGrupo(g);
    if (!registos.length) return toast("Este grupo vem de outro aquário: apaga-o lá ou regista a saída.", "erro");
    const proprio = !!g.origem && g.origem.tipo !== "detalhe";
    vibrar("aviso");
    const ok = await confirmar({
      titulo: `Apagar “${titulo}”?`,
      mensagem: proprio
        ? `Remove o grupo e ${plural(registos.length, "registo", "registos")} do histórico, como se nunca tivesse existido. Não conta como morte nem saída.`
        : `Remove ${plural(registos.length, "registo", "registos")} de ${g.especie} deste aquário do histórico (todos os animais desta espécie aqui). Não conta como morte nem saída.`,
      acao: "Apagar do histórico",
      destrutivo: true,
    });
    if (!ok) return;
    apagar.mutate(
      { id: registos[0].id, ids: registos.map((r) => r.id) },
      {
        onSuccess: () => toast(`${titulo} apagado`, "ok"),
        onError: () => toast("Não foi possível apagar (estás online?).", "erro"),
      },
    );
  }

  async function menu(g: GrupoFauna) {
    const titulo = g.origem ? nomeGrupoFauna(g.origem) : g.especie;
    const i = await escolher({
      titulo,
      mensagem: `${plural(g.quantidade, "animal", "animais")}${g.origem?.notas ? ` · ${g.origem.notas}` : ""}`,
      opcoes: [
        { texto: g.origem ? "Editar identificação e foto" : "Detalhar animais deste grupo" },
        { texto: "Registar saída, morte ou transferência" },
        { texto: "Apagar grupo (registo por engano)", destrutivo: true },
      ],
    });
    if (i === 0 && g.origem) abrirRegistar({ tipo: "fauna", aquarioId: g.origem.aquario_id, editarId: g.origem.id });
    if (i === 0 && !g.origem) abrirRegistar({ tipo: "fauna", aquarioId: id, faunaContexto: { especie: g.especie, detalhar: true } });
    if (i === 1) abrirRegistar({ tipo: "fauna", aquarioId: id, faunaContexto: { especie: g.especie, grupoId: g.origem?.id } });
    if (i === 2) await apagarGrupo(g);
  }

  return (
    <Seccao titulo="Fauna no aquário">
      {grupos.length ? (
        <>
          <p className="mb-2 px-1 text-footnote text-text-2">{plural(resumo.total, "animal", "animais")} · {plural(resumo.lista.length, "espécie", "espécies")}</p>
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
                    <FaunaSemFoto decorativo tipo={tipoFaunaPorNome(g.especie)} className="size-12 shrink-0 !aspect-square rounded-[11px]" />
                  )}
                  <button type="button" onClick={() => void menu(g)} className="pressable flex min-h-[66px] min-w-0 flex-1 items-center gap-2 py-2 pr-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-subhead font-semibold leading-tight">{titulo}</span>
                      <span className="mt-0.5 block truncate text-caption text-text-2">
                        {g.origem?.notas || (g.origem ? "Grupo identificado" : "Grupo genérico")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-surface-2 px-1.5 py-1 text-subhead font-semibold tabular-nums">×{g.quantidade}</span>
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
