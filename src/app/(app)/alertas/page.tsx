"use client";

import { EstadoErro } from "@/components/ui/estado-erro";
import { useMemo } from "react";
import { IconeAlerta } from "@/components/alertas/icone-alerta";
import { IconVisto } from "@/components/icons";
import { useNavegar } from "@/components/shell/nav";
import { BotaoHeader, Screen } from "@/components/shell/screen";
import { SkeletonLista } from "@/components/ui/skeleton";
import { cx } from "@/lib/cx";
import { cabecalhoDia, hora } from "@/lib/formato";
import { useColecao, useGuardar } from "@/lib/query/dados";
import type { Alerta } from "@/lib/tipos";

export default function AlertasPage() {
  const alertas = useColecao("alertas");
  const guardar = useGuardar("alertas");
  const navegar = useNavegar();
  const lista = useMemo(() => alertas.data ?? [], [alertas.data]);
  const naoLidos = lista.filter((a) => !a.lido);

  const grupos = useMemo(() => {
    const g: { dia: string; data: string; itens: Alerta[] }[] = [];
    for (const a of lista) {
      const dia = new Date(a.criado_em).toDateString();
      const ult = g.at(-1);
      if (ult?.dia === dia) ult.itens.push(a);
      else g.push({ dia, data: a.criado_em, itens: [a] });
    }
    return g;
  }, [lista]);

  function abrir(a: Alerta) {
    if (!a.lido) guardar.mutate({ ...a, lido: true });
    if (a.url) navegar(a.url, "forward");
  }

  return (
    <Screen
      titulo="Alertas"
      subtitulo={alertas.data ? (naoLidos.length ? `${naoLidos.length} por ler` : "Tudo lido") : " "}
      voltar={{ href: "/", texto: "Aquários" }}
      acoes={
        naoLidos.length > 0 && (
          <BotaoHeader label="Marcar tudo como lido" onClick={() => naoLidos.forEach((a) => guardar.mutate({ ...a, lido: true }))}>
            <IconVisto size={24} strokeWidth={2.2} />
          </BotaoHeader>
        )
      }
    >
      {alertas.isError && !alertas.data ? (
        <EstadoErro onRetry={() => void alertas.refetch()} aTentar={alertas.isFetching} />
      ) : alertas.isPending ? (
        <div className="skeleton-delay">
          <SkeletonLista linhas={5} />
        </div>
      ) : lista.length === 0 ? (
        <div className="enter-up rounded-[14px] bg-surface px-4 py-10 text-center">
          <p className="text-[17px] font-semibold">Está tudo bem 🐟</p>
          <p className="mt-1 text-text-2">Quando houver algo a fazer, aparece aqui e no telemóvel.</p>
        </div>
      ) : (
        grupos.map((g, gi) => (
          <section key={g.dia} className="enter-up mb-5" style={{ ["--i" as string]: Math.min(gi, 6) }}>
            <h3 className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-text-2">{cabecalhoDia(g.data)}</h3>
            <div className="overflow-hidden rounded-[14px] bg-surface">
              {g.itens.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => abrir(a)}
                  className="pressable-row relative flex w-full items-start gap-3 px-4 py-3 text-left after:absolute after:bottom-0 after:left-[64px] after:right-0 after:h-px after:bg-separator last:after:hidden"
                >
                  <IconeAlerta tipo={a.tipo} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx("text-[16px]", a.lido ? "font-medium text-text-2" : "font-semibold")}>{a.titulo}</span>
                      <span className="shrink-0 text-[13px] tabular-nums text-text-3">{hora(a.criado_em)}</span>
                    </span>
                    <span className="block text-[14px] text-text-2">{a.mensagem}</span>
                  </span>
                  {/* ponto de "não lido": encolhe e desaparece ao marcar */}
                  <span
                    aria-label={a.lido ? undefined : "Não lido"}
                    className={cx(
                      "mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent transition-[transform,opacity] duration-[var(--dur-std)] ease-[var(--ease-out)]",
                      a.lido ? "scale-0 opacity-0" : "scale-100 opacity-100",
                    )}
                  />
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </Screen>
  );
}
