"use client";

import "@/components/home/mare.css";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { IconSino } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { Screen } from "@/components/shell/screen";
import { useColecao } from "@/lib/query/dados";

export default function InicioPage() {
  const naoLidos = (useColecao("alertas").data ?? []).filter((a) => !a.lido).length;

  return (
    <Screen
      titulo="Início"
      subtitulo={
        <span className="mt-1 flex items-center gap-2.5">
          <svg viewBox="0 0 32 12" className="h-3 w-8 text-agua" fill="none" aria-hidden="true">
            <path d="M1 4c5 0 5-3 10-3s5 3 10 3 5-3 10-3M1 10c5 0 5-3 10-3s5 3 10 3 5-3 10-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-text-2">Diário aquático</span>
        </span>
      }
      acoes={
        <NavLink href="/alertas" tipo="forward" aria-label={naoLidos ? `Alertas, ${naoLidos} por ler` : "Alertas"} className="botao-circular pressable relative">
          <IconSino size={21} />
          {naoLidos > 0 && (
            <span aria-hidden className="pop-in absolute -right-0.5 -top-0.5 min-w-[18px] ring-2 ring-bg rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white">
              {naoLidos}
            </span>
          )}
        </NavLink>
      }
    >
      <HomeDashboard />
    </Screen>
  );
}
