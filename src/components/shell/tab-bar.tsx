"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconAquario, IconCasa, IconDefinicoes, IconHistorico, IconMais } from "@/components/icons";
import { cx } from "@/lib/cx";
import { abrirRegistar } from "@/lib/ui-store";
import { irAoTopo } from "@/lib/gestos";
import { NavLink } from "./nav";

const TABS = [
  { href: "/", label: "Início", icon: IconCasa, ativo: (p: string) => p === "/" || p === "/alertas" },
  { href: "/aquarios", label: "Aquários", icon: IconAquario, ativo: (p: string) => p === "/aquarios" || p === "/aquario" },
  { href: "/historico", label: "Histórico", icon: IconHistorico, ativo: (p: string) => p.startsWith("/historico") },
  { href: "/definicoes", label: "Definições", icon: IconDefinicoes, ativo: (p: string) => ["/definicoes", "/produtos", "/desejos", "/ferias", "/fontes"].some((r) => p.startsWith(r)) },
];

/** Posição de cada destino na cápsula (o "+" ocupa o centro). */
const SLOT = [0, 1, 3, 4];

/**
 * Navegação flutuante: cápsula destacada da página, com rótulos curtos
 * (como no iOS) e uma pastilha clara que desliza para o destino ativo
 * (só transform). O "+" central é o botão da marca, com relevo: abre o
 * registo rápido e não parece um destino.
 */
export function TabBar() {
  const pathname = usePathname();
  const ativo = TABS.findIndex((t) => t.ativo(pathname));

  return (
    <nav aria-label="Navegação principal" style={{ viewTransitionName: "app-tabbar" }} className="tabbar">
      <div className="tabbar-capsula">
        {/* disco do destino ativo: desliza entre posições */}
        <span
          aria-hidden
          className="tabbar-disco"
          data-visivel={ativo >= 0 ? "1" : undefined}
          style={{ ["--slot" as string]: SLOT[Math.max(0, ativo)] }}
        />
        <Tab tab={TABS[0]} ativo={ativo === 0} pathname={pathname} />
        <Tab tab={TABS[1]} ativo={ativo === 1} pathname={pathname} />
        <button
          type="button"
          aria-label="Registar"
          onClick={() => {
            // No detalhe de um aquário, o registo já vem com ele escolhido
            const id = pathname.startsWith("/aquario")
              ? new URLSearchParams(window.location.search).get("id") ?? undefined
              : undefined;
            abrirRegistar({ aquarioId: id });
          }}
          className="tab tab-registar group"
        >
          <span className="tab-registar-anel">
            <IconMais size={24} strokeWidth={2.6} />
          </span>
        </button>
        <Tab tab={TABS[2]} ativo={ativo === 2} pathname={pathname} />
        <Tab tab={TABS[3]} ativo={ativo === 3} pathname={pathname} />
      </div>
    </nav>
  );
}

function Tab({ tab, ativo, pathname }: { tab: (typeof TABS)[number]; ativo: boolean; pathname: string }): ReactNode {
  const Icon = tab.icon;
  // Tocar na tab ativa noutro nível (ex.: detalhe) volta à raiz
  const mesmaRota = pathname === tab.href;
  return (
    <NavLink
      href={tab.href}
      tipo={ativo && pathname !== tab.href ? "back" : "tab"}
      aria-label={tab.label}
      aria-current={mesmaRota ? "page" : ativo ? "location" : undefined}
      data-ativo={ativo ? "1" : undefined}
      onClick={(e) => {
        if (mesmaRota) {
          e.preventDefault();
          irAoTopo();
        }
      }}
      className={cx("tab group")}
    >
      <Icon size={23} strokeWidth={ativo ? 2.1 : 1.8} className="tab-icone" />
      <span className="tab-rotulo" aria-hidden>{tab.label}</span>
    </NavLink>
  );
}
