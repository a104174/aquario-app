import { IconChevronDireita, IconGota } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { num } from "@/lib/formato";

type Faixa = { min: number; max: number } | null;
export type DadosAgua = {
  dureza_dgh?: Faixa;
  dureza_mg_caco3?: Faixa;
  ph?: Faixa;
  cloro_mg_l?: Faixa;
  trimestre?: string | null;
  ano?: string | null;
};

function valores(faixa: Faixa | undefined) {
  if (!faixa) return "—";
  return faixa.min === faixa.max ? num(faixa.max) : `${num(faixa.min)}–${num(faixa.max)}`;
}

export function AguaTorneira({ agua }: { agua: DadosAgua }) {
  const ph = agua.ph;
  const temEscala = ph && ph.min >= 0 && ph.max <= 14 && ph.max >= ph.min;
  const dureza = agua.dureza_dgh ?? agua.dureza_mg_caco3;
  const periodo = [agua.trimestre ? `${agua.trimestre}.º trimestre` : null, agua.ano].filter(Boolean).join(" ");

  return (
    <NavLink href="/fontes" className="mare-superficie mare-toque mare-agua mt-2.5 block rounded-[22px] p-4">
      <div className="flex items-center gap-2.5">
        <IconGota size={21} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight">Água da torneira</h3>
          <p className="mt-0.5 text-[12px] text-text-2">AGERE{periodo ? ` · ${periodo}` : ""}</p>
        </div>
        <IconChevronDireita size={17} className="shrink-0 text-text-3" />
      </div>

      <div className="mt-4 border-t border-separator pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold">pH <span className="ml-1 text-[12px] font-normal text-text-2">Acidez da água</span></p>
          <span className="text-[20px] font-semibold leading-tight tracking-tight tabular-nums">{valores(ph)}</span>
        </div>
        {temEscala ? (
          <div className="mt-3" role="img" aria-label={`Intervalo observado: pH ${valores(ph)}, numa escala de 0 a 14 com ponto neutro em 7`}>
            <div className="mare-ph-escala relative h-2.5 rounded-full" aria-hidden="true">
              <span className="mare-ph-neutro absolute top-[-3px] left-1/2 h-4 w-px" />
              <span className="mare-ph-faixa absolute top-[-2px] h-3.5 min-w-[3px] rounded-full" style={{
                left: `${ph.min / 14 * 100}%`,
                width: `${(ph.max - ph.min) / 14 * 100}%`,
                ...(ph.min === ph.max ? { transform: "translateX(-50%)" } : {}),
              }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-[11px] text-text-2" aria-hidden="true">
              <span>0 · Ácido</span><span className="text-center">7 · Neutro</span><span className="text-right">14 · Alcalino</span>
            </div>
          </div>
        ) : <p className="mt-1 text-[12px] text-text-2">{ph ? "Escala indisponível" : "Sem dados de pH"}</p>}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div className="mare-agua-dado min-w-0 rounded-[13px] px-2.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-2">
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none" className="shrink-0 text-accent" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
              <path d="m2 13 4-6 4 6-4 4Zm6-5 4-6 5 6-5 5Zm5 6 3-4 3 4-3 4Z" />
            </svg>
            Dureza
          </span>
          <span className="mt-1.5 block text-[16px] font-semibold leading-tight tabular-nums">{valores(dureza)}</span>
          <span className="block text-[11px] text-text-2">{agua.dureza_dgh ? "°dGH" : dureza ? "mg/L CaCO₃" : "Sem dados"}</span>
        </div>
        <div className="mare-agua-dado min-w-0 rounded-[13px] px-2.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-2">
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none" className="shrink-0 text-accent" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
              <path d="M9 3c2 4 5 6 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9Zm-2 9a2 2 0 0 0 2 2m7-10v4m-2-2h4" />
            </svg>
            Cloro residual
          </span>
          <span className="mt-1.5 block text-[16px] font-semibold leading-tight tabular-nums">{valores(agua.cloro_mg_l)}</span>
          <span className="block text-[11px] text-text-2">{agua.cloro_mg_l ? "mg/L" : "Sem dados"}</span>
        </div>
      </div>
    </NavLink>
  );
}
