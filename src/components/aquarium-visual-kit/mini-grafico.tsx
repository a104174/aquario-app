import { useId } from "react";
import {
  dimensoesGrafico,
  formatarDataHora,
  modeloTendencia,
  numero,
  type IntervaloVisual,
  type MedicaoVisual,
} from "./dados";
import estilos from "./visual-kit.module.css";

type Serie = NonNullable<NonNullable<ReturnType<typeof modeloTendencia>>["serie"]>;

interface MiniGraficoProps {
  rotulo: string;
  medicoes: readonly MedicaoVisual[];
  unidade?: string;
  referencia?: IntervaloVisual;
  /** Amplitude vertical mínima nas mesmas unidades das medições. */
  amplitudeMinima?: number;
  modo?: "compacto" | "expandido";
}

export function MiniGrafico({
  rotulo, medicoes, unidade, referencia, amplitudeMinima, modo = "compacto",
}: MiniGraficoProps) {
  const modelo = modeloTendencia(medicoes, referencia, amplitudeMinima);
  const serie = modelo?.serie;

  return (
    <figure className={estilos.grafico}>
      <figcaption className={estilos.cabecalhoGrafico}>
        <span>{rotulo}</span>
        {serie ? <Variacao serie={serie} unidade={unidade} /> : null}
      </figcaption>
      {serie && modelo ? (
        <>
          <TracadoTendencia serie={serie} ultimo={modelo.ultimo} unidade={unidade} expandido={modo === "expandido"} />
          {modelo.faixa ? <Referencia intervalo={modelo.faixa} unidade={unidade} /> : null}
        </>
      ) : (
        <div className={estilos.graficoVazio}>
          <span>{modelo ? "Uma medição registada" : "Sem medições"}</span>
          {modelo ? <span>
            {numero.format(modelo.ultimo.valor)} {unidade} · <time dateTime={new Date(modelo.ultimo.instante).toISOString()}>{formatarDataHora(modelo.ultimo.instante)}</time>
          </span> : <span>A evolução aparece aqui após os primeiros registos.</span>}
        </div>
      )}
    </figure>
  );
}

export function Variacao({ serie, unidade }: { serie: Serie; unidade?: string }) {
  const direcao = Math.sign(serie.variacao);
  return (
    <span className={estilos.variacao}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={direcao > 0 ? "M3 11 11 3m-5.5 0H11v5.5" : direcao < 0 ? "M3 4l8 8m-5.5 0H11V6.5" : "M3 8h10"} />
      </svg>
      <span className={estilos.sr}>Variação no período: </span>
      {direcao === 0 ? "Sem variação líquida" : <>{serie.variacaoFormatada}{unidade ? ` ${unidade}` : ""}</>}
    </span>
  );
}

export function Referencia({ intervalo, unidade }: { intervalo: IntervaloVisual; unidade?: string }) {
  return (
    <p className={estilos.referencia}>
      <span>Referência</span>
      <span>{numero.format(intervalo[0])}–{numero.format(intervalo[1])}{unidade ? ` ${unidade}` : ""}</span>
    </p>
  );
}

export function TracadoTendencia({ serie, ultimo, unidade, expandido = false }: {
  serie: Serie;
  ultimo: { instante: number; valor: number };
  unidade?: string;
  expandido?: boolean;
}) {
  const gradiente = useId();
  const { largura, altura, margem } = dimensoesGrafico;
  const fim = serie.pontos.at(-1)!;
  const base = altura - margem;
  const marcadores = expandido && serie.pontos.length <= 12 ? serie.pontos : [serie.pontos[0], fim];
  const comUnidade = (valor: number) => unidade ? `${numero.format(valor)} ${unidade}` : numero.format(valor);
  const descricao = `${serie.pontos.length} medições. De ${comUnidade(serie.primeiro.valor)}, ${formatarDataHora(serie.primeiro.instante)}, até ${comUnidade(ultimo.valor)}, ${formatarDataHora(ultimo.instante)}.`;

  return (
    <div className={expandido ? estilos.tracadoExpandido : estilos.tracado}>
      <div className={estilos.areaGrafico}>
        <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" role="img" aria-label={descricao} focusable="false">
          <defs>
            <linearGradient id={gradiente} x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop stopColor="currentColor" stopOpacity=".2" />
              <stop offset="1" stopColor="currentColor" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {serie.banda ? (
            <rect x={margem} y={serie.banda.y} width={largura - 2 * margem} height={serie.banda.altura} fill="currentColor" opacity=".11" />
          ) : null}
          <path d={`M${margem},${base}H${largura - margem}`} className={estilos.linhaBase} vectorEffect="non-scaling-stroke" />
          <path d={`${serie.linha} L${fim.x},${base} H${margem} Z`} fill={`url(#${gradiente})`} />
          <path d={serie.linha} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
          {marcadores.map(({ x, y }, i) => (
            <path key={i} d={`M${x},${y}h.001`} stroke="currentColor" strokeWidth={i === marcadores.length - 1 ? 6 : 4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {expandido ? (
          <div className={estilos.escala} aria-hidden="true">
            <span>{numero.format(serie.dominio[1])}</span>
            <span>{numero.format(serie.dominio[0])}</span>
          </div>
        ) : null}
      </div>
      {expandido ? (
        <div className={estilos.datasGrafico} aria-hidden="true">
          <span><strong>{comUnidade(serie.primeiro.valor)}</strong>{formatarDataHora(serie.primeiro.instante)}</span>
          <span><strong>{comUnidade(ultimo.valor)}</strong>{formatarDataHora(ultimo.instante)}</span>
        </div>
      ) : null}
    </div>
  );
}
