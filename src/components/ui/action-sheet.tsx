"use client";

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

export function fecharEscolha(indice: number | null) {
  atual?.resolver(indice);
  if (atual) atual = { ...atual, resolver: () => {} };
  aberto = false;
  emitir();
}

export const snapshotEscolha = () => (aberto ? atual : null);
export const ultimoPedido = () => atual;
export const subscreverEscolha = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};

