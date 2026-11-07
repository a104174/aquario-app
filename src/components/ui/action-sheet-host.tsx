"use client";

import { useSyncExternalStore } from "react";
import { Drawer } from "vaul";
import { cx } from "@/lib/cx";
import { fecharEscolha, snapshotEscolha, subscreverEscolha, ultimoPedido } from "./action-sheet";

export function ActionSheetHost() {
  const pedido = useSyncExternalStore(subscreverEscolha, snapshotEscolha, () => null);
  // Mantém o último conteúdo visível durante a animação de saída
  const conteudo = pedido ?? ultimoPedido();

  return (
    <Drawer.Root open={!!pedido} onOpenChange={(o) => !o && fecharEscolha(null)} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-lg px-2 pb-[calc(var(--safe-bottom)+8px)] outline-none"
        >
          <Drawer.Title className="sr-only">{conteudo?.titulo ?? "Opções"}</Drawer.Title>
          <div className="overflow-hidden rounded-[14px] bg-surface/95 backdrop-blur-xl">
            {(conteudo?.titulo || conteudo?.mensagem) && (
              <div className="border-b border-separator px-4 py-3 text-center">
                {conteudo.titulo && <p className="text-footnote font-semibold text-text-2">{conteudo.titulo}</p>}
                {conteudo.mensagem && <p className="mt-0.5 text-footnote text-text-2">{conteudo.mensagem}</p>}
              </div>
            )}
            {conteudo?.opcoes.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => fecharEscolha(i)}
                className={cx(
                  "pressable-row block h-14 w-full border-b border-separator text-title3 last:border-b-0",
                  o.destrutivo ? "text-danger" : "text-accent",
                )}
              >
                {o.texto}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fecharEscolha(null)}
            className="pressable-row mt-2 block h-14 w-full rounded-[14px] bg-surface text-title3 font-semibold text-accent"
          >
            Cancelar
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
