"use client";

import { IconeAlerta } from "@/components/alertas/icone-alerta";
import { Exterior } from "@/components/fontes/exterior";
import { IconChevronDireita, IconSino } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { estadoAtivo } from "@/lib/alertas";
import { useColecao, useDefinicoes, DEFINICOES_PADRAO } from "@/lib/query/dados";
import { AtalhosRapidos } from "./atalhos-rapidos";
import { CicloTpa } from "./ciclo-tpa";
import { FotosEmDestaque } from "./fotos-em-destaque";

export function HomeDashboard() {
  const { data: aquarios } = useColecao("aquarios");
  const { data: tpas } = useColecao("tpas");
  const { data: fotos } = useColecao("fotos");
  const { data: alertas } = useColecao("alertas");
  const intervalo = useDefinicoes().data?.intervalo_tpa_dias ?? DEFINICOES_PADRAO.intervalo_tpa_dias;
  const ativos = (alertas ?? []).filter((a) => estadoAtivo(a.estado));
  const primeiro = ativos[0];

  return (
    <div className="mare-home mx-auto max-w-[580px]">
      <section className="mare-entrada" aria-labelledby="inicio-agora">
        <h2 id="inicio-agora" className="mare-seccao">Agora</h2>
        <CicloTpa aquarios={aquarios} tpas={tpas} intervalo={intervalo} />

        <NavLink href="/alertas" className="mare-toque mare-superficie mt-2.5 flex min-h-[70px] items-center gap-3 rounded-[18px] px-3.5 py-2.5">
          {primeiro ? <IconeAlerta tipo={primeiro.tipo} /> : <IconSino size={22} className="mx-2 shrink-0 text-accent" />}
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-snug">{!alertas ? "Alertas" : primeiro ? `${ativos.length} ${ativos.length === 1 ? "alerta ativo" : "alertas ativos"}` : "Sem alertas ativos"}</span>
            <span className="mt-0.5 block truncate text-[13px] text-text-2">{primeiro?.titulo ?? (alertas ? "Ver centro de alertas" : "Consultar avisos")}</span>
          </span>
          <IconChevronDireita size={17} className="shrink-0 text-text-3" />
        </NavLink>
      </section>

      <AtalhosRapidos />
      <Exterior destaque />
      {fotos && <FotosEmDestaque fotos={fotos} aquarios={aquarios ?? []} />}
    </div>
  );
}
