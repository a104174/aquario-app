import { useId } from "react";
import { formatarDia, modeloTpa, numero } from "./dados";
import { IconeAquario } from "./icone-aquario";
import estilos from "./visual-kit.module.css";

interface CicloTrocaAguaProps {
  ultimaTpa?: string | null;
  /** Instante de referência explícito para permitir a mesma renderização no servidor e no cliente. */
  agora: string;
  /** Dias de calendário da regra configurada para o aquário. */
  intervaloDias?: number | null;
}

export function CicloTrocaAgua({ ultimaTpa, agora, intervaloDias }: CicloTrocaAguaProps) {
  const titulo = useId();
  const ciclo = modeloTpa(ultimaTpa, agora, intervaloDias);
  const agenda = ciclo?.agenda;
  const decorrido = ciclo?.dias === 0 ? "Hoje" : ciclo?.dias === 1 ? "Há 1 dia" : `Há ${numero.format(ciclo?.dias ?? 0)} dias`;

  return (
    <section className={estilos.ciclo} aria-labelledby={titulo}>
      <div className={estilos.topoParametro}>
        <div className={estilos.seloParametro}><IconeAquario tipo="manutencao" tamanho={22} /></div>
        <div>
          <h3 id={titulo}>Troca de água</h3>
          <p className={estilos.secundario}>Manutenção · TPA</p>
        </div>
      </div>
      {ciclo ? (
        <>
          <div className={estilos.corpoCiclo}>
            <div>
              <p className={estilos.valor}>{decorrido}</p>
              <p className={estilos.secundario}>
                {agenda ? `${numero.format(ciclo.dias)} de ${numero.format(agenda.intervalo)} ${agenda.intervalo === 1 ? "dia" : "dias"} do ciclo` : "Sem periodicidade definida"}
              </p>
            </div>
            {agenda ? <NivelCiclo progresso={agenda.progresso} /> : null}
          </div>
          <dl className={estilos.datasCiclo}>
            <div>
              <dt>Última TPA</dt>
              <dd><time dateTime={new Date(ciclo.ultima).toISOString()}>{formatarDia(ciclo.ultima)}</time></dd>
            </div>
            {agenda ? (
              <div>
                <dt>{agenda.estado}</dt>
                <dd><time dateTime={agenda.data}>{agenda.dataFormatada}</time></dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : (
        <div className={estilos.leituraVazia}>
          <p>Sem trocas registadas</p>
          <span>A primeira TPA inicia o histórico de manutenção.</span>
        </div>
      )}
    </section>
  );
}

function NivelCiclo({ progresso }: { progresso: number }) {
  const recorte = useId();
  const altura = 60 * progresso;
  const y = 72 - altura;

  return (
    <svg className={estilos.nivelCiclo} viewBox="0 0 112 82" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={recorte}>
          <rect x="6" y="12" width="100" height="60" rx="13" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${recorte})`}>
        <rect x="6" y="12" width="100" height="60" fill="currentColor" opacity=".055" />
        {altura > 0 ? (
          <g className={estilos.nivelAnimado}>
            <rect x="6" y={y} width="100" height={altura} fill="currentColor" opacity=".2" />
            <path d={`M6 ${y}h100`} stroke="currentColor" strokeWidth="1.5" />
          </g>
        ) : null}
        <path d="M15 27h10m-10 15h16m-16 15h10M87 27h10m-16 15h16m-10 15h10" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <rect x="6" y="12" width="100" height="60" rx="13" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.2" />
      <path d="M44 77h24" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
