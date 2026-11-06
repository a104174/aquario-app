"use client";

import { AtalhosRapidos } from "@/components/home/atalhos-rapidos";
import { FotosEmDestaque } from "@/components/home/fotos-em-destaque";
import { IconeAlerta } from "@/components/alertas/icone-alerta";
import { IconCamara, IconChevronDireita, IconGota, IconSino } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { estadoAtivo } from "@/lib/alertas";
import { diasDesde } from "@/lib/formato";
import { useColecao, useDefinicoes, DEFINICOES_PADRAO } from "@/lib/query/dados";

export function HomeDashboard() {
  const { data: aquarios = [] } = useColecao("aquarios");
  const { data: tpas = [] } = useColecao("tpas");
  const { data: fotos = [] } = useColecao("fotos");
  const { data: alertas = [] } = useColecao("alertas");
  const intervalo = useDefinicoes().data?.intervalo_tpa_dias ?? DEFINICOES_PADRAO.intervalo_tpa_dias;
  const ativos = alertas.filter((a) => estadoAtivo(a.estado));

  const ciclos = aquarios.map((aquario) => {
    const ultima = tpas.find((t) => t.aquario_id === aquario.id);
    return { aquario, dias: ultima ? diasDesde(ultima.data) : null };
  });
  const proxima = [...ciclos].sort((a, b) => (b.dias ?? Infinity) - (a.dias ?? Infinity))[0];

  return (
    <>
      <section className="mb-6">
        <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-text-2">Agora</h2>
        <div className="grid grid-cols-3 gap-2">
          <NavLink
            href="/alertas"
            tipo="forward"
            className="pressable rounded-[16px] bg-surface p-3 shadow-[var(--shadow-card)]"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ativos.length ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok"}`}>
              <IconSino size={18} />
            </span>
            <span className="mt-3 block text-[22px] font-bold tabular-nums">{ativos.length}</span>
            <span className="block text-[11px] leading-tight text-text-2">{ativos.length === 1 ? "alerta ativo" : "alertas ativos"}</span>
          </NavLink>

          <NavLink
            href={proxima ? `/aquario?id=${proxima.aquario.id}` : "/"}
            tipo="forward"
            className="pressable rounded-[16px] bg-surface p-3 shadow-[var(--shadow-card)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
              <IconGota size={18} />
            </span>
            <span className="mt-3 block truncate text-[15px] font-bold">
              {proxima?.dias == null ? "Sem TPA" : proxima.dias >= intervalo ? `${proxima.dias} dias` : `em ${intervalo - proxima.dias} d`}
            </span>
            <span className="block truncate text-[11px] leading-tight text-text-2">{proxima?.aquario.nome ?? "Próxima TPA"}</span>
          </NavLink>

          <div className="rounded-[16px] bg-surface p-3 shadow-[var(--shadow-card)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(139_92_246/0.14)] text-[#8b5cf6]">
              <IconCamara size={18} />
            </span>
            <span className="mt-3 block text-[22px] font-bold tabular-nums">{fotos.length}</span>
            <span className="block text-[11px] leading-tight text-text-2">{fotos.length === 1 ? "fotografia" : "fotografias"}</span>
          </div>
        </div>
      </section>

      <AtalhosRapidos />
      <FotosEmDestaque fotos={fotos} aquarios={aquarios} />

      {ativos.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-2">Precisa de atenção</h2>
            <NavLink href="/alertas" tipo="forward" className="pressable flex min-h-11 items-center text-[13px] font-semibold text-accent">
              Ver todos <IconChevronDireita size={16} />
            </NavLink>
          </div>
          <div className="overflow-hidden rounded-[16px] bg-surface shadow-[var(--shadow-card)]">
            {ativos.slice(0, 2).map((alerta) => (
              <NavLink
                key={alerta.id}
                href="/alertas"
                tipo="forward"
                className="pressable-row relative flex min-h-[68px] items-center gap-3 px-4 py-3 after:absolute after:bottom-0 after:left-[64px] after:right-0 after:h-px after:bg-separator last:after:hidden"
              >
                <IconeAlerta tipo={alerta.tipo} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{alerta.titulo}</span>
                  <span className="line-clamp-1 block text-[13px] text-text-2">{alerta.mensagem}</span>
                </span>
                <IconChevronDireita size={18} className="shrink-0 text-text-3" />
              </NavLink>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
