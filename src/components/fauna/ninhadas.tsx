"use client";

import { IconBebe } from "@/components/icons";
import { escolher } from "@/components/ui/action-sheet";
import { Seccao } from "@/components/shell/screen";
import { cx } from "@/lib/cx";
import { dataCurta, diasDesde, textoHaDias } from "@/lib/formato";
import { NOME_ESTADO, proximoMarco } from "@/lib/ninhadas";
import { useApagar, useColecao, useGuardar } from "@/lib/query/dados";
import { abrirRegistar } from "@/lib/ui-store";
import type { Ninhada } from "@/lib/tipos";

export function Ninhadas({ aquarioId }: { aquarioId: string }) {
  const { data: todas = [] } = useColecao("ninhadas");
  const guardar = useGuardar("ninhadas");
  const apagar = useApagar("ninhadas");
  const lista = todas.filter((n) => n.aquario_id === aquarioId);

  async function opcoes(n: Ninhada) {
    const acoes = [
      ...(n.estado === "ativa" ? [{ texto: "Machos separados", f: () => guardar.mutate({ ...n, estado: "separada" }) }] : []),
      ...(n.estado !== "encerrada" ? [{ texto: "Encerrar ninhada", f: () => guardar.mutate({ ...n, estado: "encerrada" }) }] : []),
      { texto: "Editar", f: () => abrirRegistar({ tipo: "ninhada", editarId: n.id, aquarioId }) },
      { texto: "Apagar", destrutivo: true, f: () => apagar.mutate({ id: n.id }) },
    ];
    const i = await escolher({ titulo: `Ninhada da ${n.mae}`, opcoes: acoes });
    if (i !== null) acoes[i].f();
  }

  return (
    <Seccao
      titulo="Ninhadas"
      acao={
        <button type="button" onClick={() => abrirRegistar({ tipo: "ninhada", aquarioId })} className="pressable -my-3 flex min-h-11 items-center px-1 text-subhead font-medium text-accent">
          Registar parto
        </button>
      }
    >
      {lista.length === 0 ? (
        <p className="rounded-[14px] bg-surface px-4 py-5 text-center text-subhead text-text-2">Sem ninhadas registadas.</p>
      ) : (
        <div className="overflow-hidden rounded-[14px] bg-surface">
          {lista.map((n) => {
            const prox = proximoMarco(n);
            const hoje = prox && diasDesde(prox.quando.toISOString()) >= 0;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => opcoes(n)}
                className={cx(
                  "pressable-row relative flex w-full items-start gap-3 px-4 py-3 text-left after:absolute after:bottom-0 after:left-[64px] after:right-0 after:h-px after:bg-separator last:after:hidden",
                  n.estado === "encerrada" && "opacity-55",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <IconBebe size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-callout font-semibold">{n.mae}</span>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-caption text-text-2">{NOME_ESTADO[n.estado]}</span>
                  </span>
                  <span className="block text-subhead text-text-2">
                    Parto a {dataCurta(n.data_parto + "T12:00:00")} · {textoHaDias(diasDesde(n.data_parto + "T12:00:00"))}
                  </span>
                  {prox && (
                    <span className={cx("mt-1 block text-subhead", hoje ? "font-semibold text-warning" : "text-text")}>
                      {hoje ? "⚠︎ " : "→ "}
                      {prox.texto} · {dataCurta(prox.quando.toISOString())}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Seccao>
  );
}
