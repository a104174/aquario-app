"use client";

import { Exterior } from "@/components/fontes/exterior";
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
      subtitulo="O teu aquário, num relance"
      acoes={
        <NavLink href="/alertas" tipo="forward" aria-label={naoLidos ? `Alertas, ${naoLidos} por ler` : "Alertas"} className="pressable relative flex h-11 w-11 items-center justify-center rounded-full text-white">
          <IconSino size={24} />
          {naoLidos > 0 && (
            <span aria-hidden className="pop-in absolute right-1 top-1.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white">
              {naoLidos}
            </span>
          )}
        </NavLink>
      }
    >
      <Exterior destaque />
      <HomeDashboard />
    </Screen>
  );
}
