"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Bottom sheet (vaul). Carregada a pedido: o vaul/radix (~70 KB) sai do
 * bundle inicial e chega logo a seguir à hidratação, antes de ser preciso.
 */
const SheetDinamica = dynamic(() => import("./sheet-impl"), { ssr: false });

/**
 * Só monta (e só descarrega o vaul) na primeira vez que abre; o 1.º toque
 * no ecrã já o pré-carrega (app-shell), por isso abre sem esperar.
 */
export function Sheet(props: ComponentProps<typeof SheetDinamica>) {
  const [usada, setUsada] = useState(props.open);
  if (props.open && !usada) setUsada(true);
  return usada ? <SheetDinamica {...props} /> : null;
}

export function BotaoSheet({
  children,
  onClick,
  forte,
  disabled,
  type = "button",
  form,
}: {
  children: ReactNode;
  onClick?: () => void;
  forte?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  form?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "pressable flex min-h-11 items-center rounded-lg px-2 text-body text-accent disabled:opacity-40",
        forte && "font-semibold",
      )}
    >
      {children}
    </button>
  );
}
