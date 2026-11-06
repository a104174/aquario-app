"use client";

import { useSyncExternalStore } from "react";
import { Drawer } from "vaul";
import { cx } from "@/lib/cx";

// ---------------------------------------------------------------------
//  Action sheet própria (nunca alert/confirm nativos).
//  Uso:  const ok = await confirmar({ titulo, acao: "Apagar", destrutivo: true })
//        const i  = await escolher({ titulo, opcoes: [...] })
// ---------------------------------------------------------------------

type Opcao = { texto: string; destrutivo?: boolean };
type Pedido = {
  titulo?: string;
  mensagem?: string;
  opcoes: Opcao[];
  resolver: (indice: number | null) => void;
};

let atual: Pedido | null = null;
let aberto = false;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());

export function escolher(p: Omit<Pedido, "resolver">): Promise<number | null> {
  atual?.resolver(null);
  return new Promise((resolver) => {
    atual = { ...p, resolver };
    aberto = true;
    emitir();
  });
}

export async function confirmar(p: { titulo?: string; mensagem?: string; acao: string; destrutivo?: boolean }) {
  const i = await escolher({ titulo: p.titulo, mensagem: p.mensagem, opcoes: [{ texto: p.acao, destrutivo: p.destrutivo }] });
  return i === 0;
}

function fechar(indice: number | null) {
  atual?.resolver(indice);
  if (atual) atual = { ...atual, resolver: () => {} };
  aberto = false;
  emitir();
}

const snapshot = () => (aberto ? atual : null);
const subscrever = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};

export function ActionSheetHost() {
  const pedido = useSyncExternalStore(subscrever, snapshot, () => null);
  // Mantém o último conteúdo visível durante a animação de saída
  const conteudo = pedido ?? atual;

  return (
    <Drawer.Root open={!!pedido} onOpenChange={(o) => !o && fechar(null)} noBodyStyles>
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
                {conteudo.titulo && <p className="text-[13px] font-semibold text-text-2">{conteudo.titulo}</p>}
                {conteudo.mensagem && <p className="mt-0.5 text-[13px] text-text-2">{conteudo.mensagem}</p>}
              </div>
            )}
            {conteudo?.opcoes.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => fechar(i)}
                className={cx(
                  "pressable-row block h-14 w-full border-b border-separator text-[20px] last:border-b-0",
                  o.destrutivo ? "text-danger" : "text-accent",
                )}
              >
                {o.texto}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fechar(null)}
            className="pressable-row mt-2 block h-14 w-full rounded-[14px] bg-surface text-[20px] font-semibold text-accent"
          >
            Cancelar
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
