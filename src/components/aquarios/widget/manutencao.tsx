import { cx } from "@/lib/cx";
import type { EstadoTpa } from "@/lib/derivados";
import "./widget.css";

const R = 30;
const C = 2 * Math.PI * R;
// arco de 300° (abre em baixo, como um mostrador)
const ARCO = C * (300 / 360);

/**
 * Ciclo de TPA: mostrador com os dias desde a última troca sobre o intervalo
 * configurado. A cor acompanha a urgência; sem histórico o mostrador fica
 * tracejado e neutro (não é "0 %" nem "atrasado").
 */
export function AnelTpa({ estado, dias, intervalo }: { estado: EstadoTpa; dias: number | null; intervalo: number }) {
  const nunca = estado === "nunca";
  const prog = nunca ? 0 : Math.min(1, dias! / intervalo);
  const cor = estado === "atrasada" ? "var(--danger)" : estado === "quase" ? "var(--warning)" : "var(--tom)";
  const rotulo = nunca
    ? "Sem histórico de TPA"
    : `Última TPA há ${dias} ${dias === 1 ? "dia" : "dias"}, intervalo de ${intervalo} dias${estado === "atrasada" ? ", em atraso" : ""}`;

  return (
    <div role="img" aria-label={rotulo} className="flex w-[92px] shrink-0 flex-col items-center">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-[240deg]" aria-hidden>
          <circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={nunca ? "2 6" : `${ARCO} ${C}`}
          />
          {!nunca && (
            <circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              stroke={cor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${ARCO} ${C}`}
              strokeDashoffset={ARCO * (1 - Math.max(0.03, prog))}
              className={"aw-arco"}
              style={{ ["--arco-total" as string]: ARCO }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {nunca ? (
            <span className="text-title2 font-semibold leading-none text-text-3">—</span>
          ) : (
            <>
              <span className={cx("text-title2 font-bold leading-none tabular-nums", estado === "atrasada" && "text-danger")}>
                {Math.min(dias!, 99)}
              </span>
              <span className="mt-0.5 text-caption font-medium text-text-2">{dias === 1 ? "dia" : "dias"}</span>
            </>
          )}
        </div>
      </div>
      <p
        className={cx(
          "-mt-1 text-center text-caption font-medium leading-tight",
          estado === "atrasada" ? "text-danger" : estado === "quase" ? "text-warning" : "text-text-2",
        )}
      >
        {nunca ? "Sem TPAs" : estado === "atrasada" ? `TPA em atraso` : estado === "quase" ? "TPA amanhã" : `desde a TPA`}
      </p>
      {!nunca && <p className="text-caption tabular-nums text-text-3">ciclo de {intervalo} d</p>}
    </div>
  );
}
