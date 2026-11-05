"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

export type TipoNav = "forward" | "back" | "tab";

const TIPOS: Record<TipoNav, string> = { forward: "nav-forward", back: "nav-back", tab: "nav-tab" };

/** Fallback sem View Transitions: o CSS anima .screen-enter conforme data-nav. */
function marcar(tipo: TipoNav) {
  document.documentElement.dataset.nav = tipo;
}

export function NavLink({ tipo = "forward", onClick, ...props }: ComponentProps<typeof Link> & { tipo?: TipoNav }) {
  return (
    <Link
      {...props}
      transitionTypes={[TIPOS[tipo]]}
      onClick={(e) => {
        marcar(tipo);
        onClick?.(e);
      }}
    />
  );
}

export function useNavegar() {
  const router = useRouter();
  return (href: string, tipo: TipoNav = "forward", substituir = false) => {
    marcar(tipo);
    const opts = { transitionTypes: [TIPOS[tipo]] };
    if (substituir) router.replace(href, opts);
    else router.push(href, opts);
  };
}
