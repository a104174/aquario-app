"use client";

import { IconCaixa } from "@/components/icons";
import { feedbackTatil } from "@/lib/haptics";
import { hojeISO } from "@/lib/produtos";
import { useGuardar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { Produto } from "@/lib/tipos";

const NIVEIS = [
  { valor: 1, texto: "Cheio", largura: "100%" },
  { valor: 0.5, texto: "Metade", largura: "50%" },
  { valor: 0.2, texto: "Pouco", largura: "20%" },
] as const;

export function StockVisual({ produto, onFeito }: { produto: Produto; onFeito: () => void }) {
  const guardar = useGuardar("produtos");

  function definir(fracao: number) {
    feedbackTatil(fracao <= 0.2 ? "atencao" : "leve");
    guardar.mutate({
      ...produto,
      stock_manual_fracao: fracao,
      stock_atualizado_em: new Date().toISOString(),
    });
    toast(`✓ ${produto.nome}: ${fracao === 1 ? "cheio" : fracao === 0.5 ? "a meio" : "pouco stock"}`, "ok");
    onFeito();
  }

  function novaEmbalagem() {
    feedbackTatil("sucesso");
    const agora = new Date().toISOString();
    guardar.mutate({
      ...produto,
      data_abertura: hojeISO(),
      stock_manual_fracao: 1,
      stock_atualizado_em: agora,
      ativo: true,
    });
    toast("✓ Nova embalagem registada", "ok");
    onFeito();
  }

  return (
    <div className="mb-5">
      <p className="mb-2 px-1 text-footnote font-semibold uppercase tracking-wide text-text-2">Atualizar stock</p>
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={novaEmbalagem}
          className="pressable flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[14px] bg-accent-soft px-1 text-accent-forte"
        >
          <IconCaixa size={22} />
          <span className="text-caption font-semibold">Nova</span>
        </button>
        {NIVEIS.map((nivel) => (
          <button
            key={nivel.valor}
            type="button"
            onClick={() => definir(nivel.valor)}
            className="pressable flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[14px] bg-surface px-2 shadow-[var(--shadow-card)]"
          >
            <span className="flex h-7 w-5 items-end overflow-hidden rounded-[5px] border-2 border-accent/60 p-0.5" aria-hidden>
              <span className="w-full rounded-[2px] bg-accent" style={{ height: nivel.largura }} />
            </span>
            <span className="text-caption font-semibold">{nivel.texto}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-caption leading-snug text-text-3">Uma estimativa rápida; as TPAs seguintes continuam a descontar o condicionador automaticamente.</p>
    </div>
  );
}
