"use client";

import { IconGota, IconTermometro } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { num } from "@/lib/formato";
import { useColecao } from "@/lib/query/dados";

type Dia = { data: string; max: number; min: number };
type Faixa = { min: number; max: number } | null;

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const nomeDia = (iso: string, i: number) => (i === 0 ? "Hoje" : i === 1 ? "Amanhã" : SEMANA[new Date(iso + "T12:00:00").getDay()]);

/** Resumo compacto: tempo em Braga + água da torneira (AGERE). */
export function Exterior({ compacto }: { compacto?: boolean }) {
  const { data: fontes } = useColecao("fontes");
  const meteo = fontes?.find((f) => f.tipo === "meteo" && f.ativo)?.resultado as { dias?: Dia[]; limites?: { max: number; min: number } } | null | undefined;
  const agua = fontes?.find((f) => f.tipo === "agere_qualidade" && f.ativo)?.resultado as
    | { dureza_dgh?: Faixa; dureza_mg_caco3?: Faixa; ph?: Faixa; cloro_mg_l?: Faixa; trimestre?: string; ano?: string }
    | null
    | undefined;
  if (!meteo?.dias?.length && !agua) return null;
  const faixa = (f: Faixa, d = 1) => (!f ? "—" : f.min === f.max ? num(f.max, d) : `${num(f.min, d)}–${num(f.max, d)}`);

  const conteudo = (
    <>
      {meteo?.dias?.length ? (
        <div className="flex items-center gap-3">
          <IconTermometro size={20} className="shrink-0 text-accent" />
          <div className="flex flex-1 justify-between gap-2 text-[14px] tabular-nums">
            {meteo.dias.slice(0, 3).map((d, i) => {
              const alerta = meteo.limites && (d.max >= meteo.limites.max || d.min <= meteo.limites.min);
              return (
                <span key={d.data} className={alerta ? "font-semibold text-warning" : ""}>
                  <span className="text-text-2">{nomeDia(d.data, i)}</span> {Math.round(d.max)}°/{Math.round(d.min)}°
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      {agua && (
        <div className="mt-2 flex items-center gap-3 border-t border-separator pt-2">
          <IconGota size={20} className="shrink-0 text-accent" />
          <span className="flex-1 text-[14px] text-text-2">
            Torneira: <span className="font-medium text-text">≈ {faixa(agua.dureza_dgh ?? null)} °dGH</span> · pH {faixa(agua.ph ?? null)} · cloro {faixa(agua.cloro_mg_l ?? null, 2)} mg/L
          </span>
        </div>
      )}
    </>
  );

  if (compacto)
    return (
      <NavLink href="/fontes" tipo="forward" className="pressable enter-up mb-3 block rounded-[14px] bg-surface px-4 py-3">
        {conteudo}
      </NavLink>
    );
  return <div className="mb-5 rounded-[14px] bg-surface px-4 py-3">{conteudo}</div>;
}
