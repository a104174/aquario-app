"use client";

import { IconChevronDireita, IconGota, IconTermometro } from "@/components/icons";
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
    const previsao = [{ nome: "Hoje", data: hoje }, { nome: "Amanhã", data: amanha }].map((d) => ({
      ...d, valores: meteo?.dias?.find((v) => v.data === d.data),
    }));
    const temperaturas = previsao.flatMap(({ valores }) => valores ? [valores.min, valores.max] : []);
    const minima = temperaturas.length ? Math.min(...temperaturas) : 0;
    const amplitude = temperaturas.length ? Math.max(1, Math.max(...temperaturas) - minima) : 1;

    return (
      <section aria-labelledby="previsao-exterior">
        <h2 id="previsao-exterior" className="mare-seccao">Previsão exterior</h2>
        <NavLink href="/fontes" className="mare-superficie mare-toque block rounded-[22px] p-4">
          <span className="mb-3 flex items-center justify-between gap-2 text-[12px] font-medium text-text-2">
            <span className="flex items-center gap-2"><IconTermometro size={17} className="text-accent" /> Temperatura do ar</span>
            <IconChevronDireita size={17} />
          </span>
          <div className="grid gap-3 border-t border-separator pt-3">
            {previsao.map(({ nome, valores }) => {
              const fora = valores && meteo?.limites && (valores.max >= meteo.limites.max || valores.min <= meteo.limites.min);
              return (
                <div key={nome} className="grid grid-cols-[4.5rem_2.35rem_minmax(0,1fr)_2.35rem] items-center gap-1.5 text-[13px] tabular-nums">
                  <span className="font-semibold">{nome}</span>
                  {valores ? (
                    <>
                      <span className="text-right text-text-2" aria-label={`Mínima: ${num(valores.min, 1)} graus`}>{Math.round(valores.min)}°</span>
                      <span aria-hidden="true" className="relative h-1.5 rounded-full bg-surface-3">
                        <span className={`absolute top-0 h-full min-w-1 rounded-full ${fora ? "bg-warning" : "bg-accent"}`} style={{
                          left: `${(valores.min - minima) / amplitude * 100}%`,
                          width: `${(valores.max - valores.min) / amplitude * 100}%`,
                        }} />
                      </span>
                      <span className={`text-right font-semibold ${fora ? "text-warning" : ""}`} aria-label={`Máxima: ${num(valores.max, 1)} graus`}>{Math.round(valores.max)}°</span>
                    </>
                  ) : <span className="col-span-3 text-text-2">{isPending ? "A carregar…" : "Sem previsão"}</span>}
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
