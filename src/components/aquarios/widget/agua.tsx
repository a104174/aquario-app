import { cx } from "@/lib/cx";
import { diasDesde, num, textoHaDias } from "@/lib/formato";
import { INFO_PARAMETROS } from "@/lib/parametros";
import type { Parametro } from "@/lib/tipos";
import { GlifoTendencia, GlifoTeste } from "./glifos";

export type DadosParametro = {
  p: Parametro;
  valor: number;
  data: string;
  /** últimos pontos (ascendente) para o mini-gráfico */
  serie: number[];
};

/** Medição com mais de 14 dias: mostrada, mas apagada e com a idade. */
const DIAS_ANTIGO = 14;

/**
 * Água: até 4 parâmetros, sem caixas — valor dominante com unidade
 * discreta, tendência face à medição anterior e um mini-gráfico só quando
 * há pelo menos 3 medições. Fora da referência → cor e "!" (não só cor).
 * Só aparecem parâmetros medidos: ausência nunca é mostrada como 0.
 */
export function Agua({ dados }: { dados: DadosParametro[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex min-h-[76px] flex-1 items-center gap-2.5 text-text-2">
        <GlifoTeste className="h-5 w-4 shrink-0 text-text-3" />
        <p className="text-subhead leading-snug">
          Sem medições
          <span className="block text-caption text-text-3">Os valores aparecem após o 1.º teste</span>
        </p>
      </div>
    );
  }
  const recente = Math.min(...dados.map((d) => diasDesde(d.data)));
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-caption text-text-3">Água · medida {textoHaDias(recente)}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {dados.map((d) => (
          <Celula key={d.p} d={d} />
        ))}
      </div>
    </div>
  );
}

function Celula({ d }: { d: DadosParametro }) {
  const info = INFO_PARAMETROS[d.p];
  const faixa = info.faixa(d.valor);
  const idade = diasDesde(d.data);
  const antigo = idade > DIAS_ANTIGO;
  const ant = d.serie.length >= 2 ? d.serie[d.serie.length - 2] : null;
  const tolerancia = Math.max(Math.abs(d.valor) * 0.05, 10 ** -info.decimais);
  const sentido: -1 | 0 | 1 | null = ant === null ? null : Math.abs(d.valor - ant) <= tolerancia ? 0 : d.valor > ant ? 1 : -1;
  const unidade = info.unidade;
  const corValor = antigo ? "text-text-3" : faixa === "mau" ? "text-danger" : faixa === "atencao" ? "text-warning" : "text-text";

  return (
    <div role="group" className="@container min-w-0" aria-label={`${info.nome}: ${num(d.valor, info.decimais)} ${info.unidade}${faixa !== "ok" ? ", fora da referência" : ""}, medido ${textoHaDias(idade)}`}>
      <div className="flex items-center gap-1 text-caption font-medium text-text-2" aria-hidden>
        <span className={cx("h-1.5 w-1.5 rounded-full", faixa === "mau" ? "bg-danger" : faixa === "atencao" ? "bg-warning" : "bg-[var(--tom)]")} />
        {info.curto}
        {faixa !== "ok" && <span className={faixa === "mau" ? "text-danger" : "text-warning"}>!</span>}
      </div>
      <div className="flex items-end justify-between gap-1" aria-hidden>
        <p className={cx("shrink-0 whitespace-nowrap leading-none tabular-nums", corValor)}>
          <span className="text-title3 font-semibold tracking-tight">{num(d.valor, info.decimais)}</span>
          {unidade && <span className="ml-0.5 text-caption font-medium text-text-3">{unidade}</span>}
        </p>
        {antigo ? (
          <span className="shrink-0 text-caption text-text-3">{textoHaDias(idade)}</span>
        ) : (
          <span className="flex shrink-0 items-center gap-0.5 text-text-3">
            {/* mini-gráfico só quando a célula tem largura (o valor nunca é cortado) */}
            {d.serie.length >= 3 && (
              <span className="hidden @[124px]:block">
                <MiniGrafico serie={d.serie} />
              </span>
            )}
            {sentido !== null && <GlifoTendencia sentido={sentido} className="h-3 w-3" />}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniGrafico({ serie }: { serie: number[] }) {
  const w = 34;
  const h = 14;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const amp = max - min || 1;
  const pts = serie.map((v, i) => [(i / (serie.length - 1)) * w, h - 1.5 - ((v - min) / amp) * (h - 3)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts[pts.length - 1];
  return (
    <svg viewBox={`-1 0 ${w + 3} ${h}`} width={w + 4} height={h} aria-hidden>
      <path d={d} fill="none" stroke="var(--tom)" strokeOpacity="0.65" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ux} cy={uy} r="1.8" fill="var(--tom)" />
    </svg>
  );
}
