"use client";

import { useCelebracao } from "@/lib/celebrar";
import { Mascote } from "./mascote";

/**
 * Celebração (pico/fim da tarefa): a mascote em festa com bolhas e uma
 * linha de texto, a meio do ecrã, por cima de tudo mas sem apanhar toques.
 * Entra com mola; sai rápido. Anunciada a leitores de ecrã.
 */
export function CelebracaoHost() {
  const c = useCelebracao();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[34%] z-[70] flex justify-center">
      {c && (
        <div key={c.id} className="celebracao flex flex-col items-center rounded-[28px] bg-surface px-6 pb-4 pt-3 text-center shadow-[var(--shadow-flutuante)]">
          <Mascote humor="festa" tamanho={112} entrar />
          <p className="mt-1 text-title3 font-bold text-text">{c.titulo}</p>
          {c.detalhe && <p className="text-subhead text-text-2">{c.detalhe}</p>}
        </div>
      )}
    </div>
  );
}
