"use client";

import { EstadoErro } from "@/components/ui/estado-erro";
import { useState } from "react";
import { IconMais } from "@/components/icons";
import { ProdutoSheet } from "@/components/produtos/produto-sheet";
import { BotaoHeader, Screen, Seccao } from "@/components/shell/screen";
import { SkeletonLista } from "@/components/ui/skeleton";
import { cx } from "@/lib/cx";
import { estadoStock, TIPOS_PRODUTO } from "@/lib/produtos";
import { useColecao } from "@/lib/query/dados";
import type { Produto } from "@/lib/tipos";

export default function ProdutosPage() {
  const produtos = useColecao("produtos");
  const { data: tpas } = useColecao("tpas");
  const [sheet, setSheet] = useState<{ aberto: boolean; item?: Produto }>({ aberto: false });

  return (
    <Screen
      titulo="Produtos"
      subtitulo="Stock e fim estimado"
      voltar={{ href: "/definicoes", texto: "Definições" }}
      acoes={
        <BotaoHeader label="Novo produto" onClick={() => setSheet({ aberto: true })}>
          <IconMais size={24} strokeWidth={2} />
        </BotaoHeader>
      }
    >
      {produtos.isError && !produtos.data ? (
        <EstadoErro onRetry={() => void produtos.refetch()} aTentar={produtos.isFetching} />
      ) : produtos.isPending ? (
        <div className="skeleton-delay">
          <SkeletonLista linhas={3} />
        </div>
      ) : (
        TIPOS_PRODUTO.map((t) => {
          const lista = (produtos.data ?? []).filter((p) => p.tipo === t.valor);
          if (!lista.length) return null;
          return (
            <Seccao key={t.valor} titulo={t.texto}>
              <div className="overflow-hidden rounded-[14px] bg-surface">
                {lista.map((p, i) => {
                  const e = estadoStock(p, tpas);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSheet({ aberto: true, item: p })}
                      style={{ ["--i" as string]: i }}
                      className={cx(
                        "pressable-row enter-up relative block w-full px-4 py-3 text-left after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator last:after:hidden",
                        !p.ativo && "opacity-50",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-body">{p.nome}</span>
                        <span className={cx("shrink-0 text-subhead tabular-nums", e.nivel === "baixo" || e.nivel === "vazio" ? "font-semibold text-danger" : "text-text-2")}>
                          {(e.nivel === "baixo" || e.nivel === "vazio") && <span aria-hidden>⚠︎ </span>}
                          {e.resumo}
                        </span>
                      </span>
                      {e.fracao !== null && (
                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-3">
                          <span
                            className={cx(
                              "block h-full origin-left rounded-full transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)]",
                              e.nivel === "ok" ? "bg-accent" : e.nivel === "baixo" ? "bg-warning" : "bg-danger",
                            )}
                            style={{ transform: `scaleX(${Math.max(0.03, e.fracao)})` }}
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Seccao>
          );
        })
      )}
      <ProdutoSheet open={sheet.aberto} onOpenChange={(o) => setSheet((s) => ({ ...s, aberto: o }))} inicial={sheet.item} />
    </Screen>
  );
}
