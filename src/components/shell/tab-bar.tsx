"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconAquario, IconDefinicoes, IconHistorico, IconMais } from "@/components/icons";
import { cx } from "@/lib/cx";
import { abrirRegistar } from "@/lib/ui-store";
import { NavLink } from "./nav";

const TABS = [
  { href: "/", label: "Aquários", icon: IconAquario, ativo: (p: string) => p === "/" || p.startsWith("/aquario") || p.startsWith("/alertas") },
  { href: "/historico", label: "Histórico", icon: IconHistorico, ativo: (p: string) => p.startsWith("/historico") },
  { href: "/definicoes", label: "Definições", icon: IconDefinicoes, ativo: (p: string) => ["/definicoes", "/produtos", "/desejos", "/ferias", "/fontes"].some((r) => p.startsWith(r)) },
];

export function TabBar() {
  const pathname = usePathname();

  const [aquarios, historico, definicoes] = TABS;

  return (
    <nav
      style={{ viewTransitionName: "app-tabbar" }}
      className="tabbar fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-[var(--tabbar)] pb-[var(--safe-bottom)] backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto grid h-[var(--tabbar-h)] max-w-lg grid-cols-4">
        <Tab tab={aquarios} ativo={aquarios.ativo(pathname)} pathname={pathname} />
        <button
          type="button"
          onClick={() => {
            // No detalhe de um aquário, o registo já vem com ele escolhido
            const id = pathname.startsWith("/aquario")
              ? new URLSearchParams(window.location.search).get("id") ?? undefined
              : undefined;
            abrirRegistar({ aquarioId: id });
          }}
          className="group flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-accent"
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent text-accent-contrast transition-transform duration-[var(--dur-std)] ease-[var(--ease-out)] group-active:scale-[0.85] group-active:duration-[var(--dur-quick)]">
            <IconMais size={20} strokeWidth={2.4} />
          </span>
          Registar
        </button>
        <Tab tab={historico} ativo={historico.ativo(pathname)} pathname={pathname} />
        <Tab tab={definicoes} ativo={definicoes.ativo(pathname)} pathname={pathname} />
      </div>
    </nav>
  );
}

function Tab({
  tab,
  ativo,
  pathname,
}: {
  tab: (typeof TABS)[number];
  ativo: boolean;
  pathname: string;
}): ReactNode {
  const Icon = tab.icon;
  // Tocar na tab ativa noutro nível (ex.: detalhe) volta à raiz
  const mesmaRota = pathname === tab.href;
  return (
    <NavLink
      href={tab.href}
      tipo={ativo && pathname !== tab.href ? "back" : "tab"}
      aria-current={ativo ? "page" : undefined}
      onClick={(e) => {
        if (mesmaRota) e.preventDefault();
      }}
      className={cx(
        "group flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
        "transition-colors duration-[var(--dur-quick)] ease-[var(--ease-out)]",
        ativo ? "text-accent" : "text-text-3",
      )}
    >
      <span className="flex h-[30px] items-center justify-center">
        <Icon
          size={26}
          strokeWidth={ativo ? 2 : 1.7}
          className="transition-transform duration-[var(--dur-std)] ease-[var(--ease-out)] group-active:scale-[0.85] group-active:duration-[var(--dur-quick)]"
        />
      </span>
      {tab.label}
    </NavLink>
  );
}
