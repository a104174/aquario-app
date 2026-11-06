import { useId } from "react";
import {
  formatarDataHora,
  modeloTendencia,
  numero,
  type IntervaloVisual,
  type MedicaoVisual,
} from "./dados";
import { IconeAquario } from "./icone-aquario";
import { Referencia, TracadoTendencia, Variacao } from "./mini-grafico";
import estilos from "./visual-kit.module.css";

const parametros = {
  ph: { nome: "pH", detalhe: "Acidez", unidade: "", amplitude: 1, grupo: "ph" },
  temperatura_c: { nome: "Temperatura", detalhe: "Água do aquário", unidade: "°C", amplitude: 4, grupo: "termometro" },
  no2: { nome: "NO₂", detalhe: "Nitrito", unidade: "mg/L", amplitude: 0.2, grupo: "gota" },
  no3: { nome: "NO₃", detalhe: "Nitrato", unidade: "mg/L", amplitude: 10, grupo: "gota" },
  gh: { nome: "GH", detalhe: "Dureza geral", unidade: "°dGH", amplitude: 4, grupo: "dureza" },
  kh: { nome: "KH", detalhe: "Dureza carbonatada", unidade: "°dKH", amplitude: 3, grupo: "dureza" },
} as const;

export type ParametroVisual = keyof typeof parametros;

interface ParametroAguaProps {
  parametro: ParametroVisual;
  medicoes: readonly MedicaoVisual[];
  referencia?: IntervaloVisual;
}

export function ParametroAgua({ parametro, medicoes, referencia }: ParametroAguaProps) {
  const titulo = useId();
  const { nome, detalhe, unidade, amplitude, grupo } = parametros[parametro];
  const modelo = modeloTendencia(medicoes, referencia, amplitude);
  const serie = modelo?.serie;

  return (
    <section className={estilos.parametro} aria-labelledby={titulo}>
      <div className={estilos.topoParametro}>
        <div className={estilos.seloParametro}><GlifoParametro grupo={grupo} /></div>
        <div>
          <h3 id={titulo}>{nome}</h3>
          <p className={estilos.secundario}>{detalhe}</p>
        </div>
      </div>

      {modelo ? (
        <>
          <div className={estilos.leituraParametro}>
            <p className={estilos.valor}>{numero.format(modelo.ultimo.valor)}{unidade ? <span>{unidade}</span> : null}</p>
            {serie ? <Variacao serie={serie} unidade={unidade} /> : null}
          </div>
          {serie ? (
            <TracadoTendencia serie={serie} ultimo={modelo.ultimo} unidade={unidade} />
          ) : modelo.faixa ? (
            <ReguaReferencia valor={modelo.ultimo.valor} intervalo={modelo.faixa} />
          ) : null}
          <div className={estilos.rodapeParametro}>
            <time dateTime={new Date(modelo.ultimo.instante).toISOString()}>{formatarDataHora(modelo.ultimo.instante)}</time>
            {modelo.faixa ? <Referencia intervalo={modelo.faixa} unidade={unidade} /> : null}
          </div>
        </>
      ) : (
        <div className={estilos.leituraVazia}>
          <p>Sem medições</p>
          <span>O primeiro registo aparece aqui.</span>
        </div>
      )}
    </section>
  );
}

function GlifoParametro({ grupo }: { grupo: typeof parametros[ParametroVisual]["grupo"] }) {
  if (grupo === "termometro" || grupo === "gota") return <IconeAquario tipo={grupo} tamanho={22} />;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {grupo === "ph" ? (
        <path d="M4 15h16M6 12v3m4-3v3m4-3v3m4-3v3M12 9V5m-2 2 2 2 2-2M6 18h12" />
      ) : (
        <path d="m12 3 5.2 6-5.2 6-5.2-6L12 3Zm-7.2 8.6 7.2 8.2 7.2-8.2m-7.2-8.6L10.7 9l1.3 6 1.3-6L12 3Z" />
      )}
    </svg>
  );
}

function ReguaReferencia({ valor, intervalo: [inferior, superior] }: { valor: number; intervalo: IntervaloVisual }) {
  const minimo = Math.min(valor, inferior);
  const maximo = Math.max(valor, superior);
  const amplitude = maximo - minimo;
  const folga = amplitude * 0.12;
  const x = (v: number) => 8 + (v - minimo + folga) / (amplitude + 2 * folga) * 284;
  return (
    <svg className={estilos.regua} viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M8 9h284" className={estilos.linhaBase} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <path d={`M${x(inferior)} 9H${x(superior)}`} stroke="currentColor" strokeWidth="6" strokeOpacity=".24" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <path d={`M${x(inferior)} 6v6M${x(superior)} 6v6`} stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d={`M${x(valor)} 9h.001`} stroke="currentColor" strokeWidth="7" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}
