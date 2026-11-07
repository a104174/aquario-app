"use client";

import type { ReactNode } from "react";
import { IconChevronDireita } from "@/components/icons";
import { NavLink } from "./nav";

/** Linha de lista que navega para outro ecrã (estilo célula iOS). */
export function LinhaNav({
  href,
  icone,
  texto,
  detalhe,
  badge,
}: {
  href: string;
  icone: ReactNode;
  texto: string;
  detalhe?: ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      href={href}
      tipo="forward"
      className="pressable-row relative flex min-h-[48px] w-full items-center gap-3 px-4 py-2 after:absolute after:bottom-0 after:left-[52px] after:right-0 after:h-px after:bg-separator last:after:hidden"
    >
      <span className="text-accent">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body">{texto}</span>
        {detalhe && <span className="block truncate text-footnote text-text-2">{detalhe}</span>}
      </span>
      {!!badge && (
        <span className="pop-in min-w-[22px] rounded-full bg-danger-solido px-1.5 text-center text-footnote font-semibold leading-[22px] text-white">
          {badge}
        </span>
      )}
      <IconChevronDireita size={18} className="text-text-3" />
    </NavLink>
  );
}
