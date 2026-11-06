"use client";

import { IconGota, IconTermometro } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { num } from "@/lib/formato";
import { useColecao } from "@/lib/query/dados";

type Dia = { data: string; max: number; min: number };
type Faixa = { min: number; max: number } | null;

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const nomeDia = (iso: string, i: number) => (i === 0 ? "Hoje" : i === 1 ? "Amanhã" : SEMANA[new Date(iso + "T12:00:00").getDay()]);
const dataPrevisao = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
});

/** Previsão exterior e qualidade da água da torneira (AGERE). */
export function Exterior({ destaque }: { destaque?: boolean }) {
  const { data: fontes, isPending } = useColecao("fontes");
  const meteo = fontes?.find((f) => f.tipo === "meteo" && f.ativo)?.resultado as { dias?: Dia[]; limites?: { max: number; min: number } } | null | undefined;
  const agua = fontes?.find((f) => f.tipo === "agere_qualidade" && f.ativo)?.resultado as
    | { dureza_dgh?: Faixa; dureza_mg_caco3?: Faixa; ph?: Faixa; cloro_mg_l?: Faixa; trimestre?: string; ano?: string }
    | null
    | undefined;
  const faixa = (f: Faixa, d = 1) => (!f ? "—" : f.min === f.max ? num(f.max, d) : `${num(f.min, d)}–${num(f.max, d)}`);
  const resumoAgua = agua && (
    <div className="mt-2 flex items-center gap-3 border-t border-separator pt-2">
      <IconGota size={20} className="shrink-0 text-accent" />
      <span className="flex-1 text-[14px] text-text-2">
        Torneira: <span className="font-medium text-text">≈ {faixa(agua.dureza_dgh ?? null)} °dGH</span> · pH {faixa(agua.ph ?? null)} · cloro {faixa(agua.cloro_mg_l ?? null, 2)} mg/L
      </span>
    </div>
  );

  if (destaque) {
    const hoje = dataPrevisao.format();
    const amanha = new Date(Date.parse(hoje) + 86_400_000).toISOString().slice(0, 10);
    return (
      <section className="enter-up mb-6" aria-labelledby="previsao-exterior">
        <h2 id="previsao-exterior" className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-text-2">Previsão exterior</h2>
        <NavLink href="/fontes" tipo="forward" className="pressable block rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-2 divide-x divide-separator">
            {[{ nome: "Hoje", data: hoje }, { nome: "Amanhã", data: amanha }].map(({ nome, data }) => {
              const dia = meteo?.dias?.find((d) => d.data === data);
              const alerta = dia && meteo?.limites && (dia.max >= meteo.limites.max || dia.min <= meteo.limites.min);
              return (
                <div key={nome} className="px-3 first:pl-0">
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-text-2">
                    <IconTermometro size={18} className={alerta ? "text-warning" : "text-accent"} />{nome}
                  </span>
                  {dia ? (
                    <>
                      <span className={`mt-1 block text-[22px] font-bold tabular-nums ${alerta ? "text-warning" : ""}`}>{Math.round(dia.max)}° / {Math.round(dia.min)}°</span>
                      <span className="block text-[12px] text-text-2">Máx. / mín. em °C</span>
                    </>
                  ) : <span className="mt-2 block text-[13px] text-text-2">{isPending ? "A carregar…" : "Sem previsão"}</span>}
                </div>
              );
            })}
          </div>
          {resumoAgua}
        </NavLink>
      </section>
    );
  }

  if (!meteo?.dias?.length && !agua) return null;

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
      {resumoAgua}
    </>
  );

  return <div className="mb-5 rounded-[14px] bg-surface px-4 py-3">{conteudo}</div>;
}
