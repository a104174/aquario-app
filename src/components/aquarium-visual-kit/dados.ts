export interface MedicaoVisual {
  /** ISO 8601 com fuso explícito, como nos registos da aplicação. */
  data: string;
  valor: number | null;
}

export type IntervaloVisual = readonly [minimo: number, maximo: number];

export const numero = new Intl.NumberFormat("pt-PT", { maximumSignificantDigits: 8 });
const numeroComSinal = new Intl.NumberFormat("pt-PT", {
  maximumSignificantDigits: 8,
  signDisplay: "exceptZero",
});
const dataHora = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});
const diaLisboa = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Lisbon",
});
const dataCalendario = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "UTC" });
const diaMs = 86_400_000;

export function instante(data: string): number | null {
  const iso = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(data);
  if (!iso) return null;

  const dia = new Date(iso[1]);
  const ms = Date.parse(data);
  // Date.parse aceita dias impossíveis, como 30 de fevereiro, e avança para março.
  return Number.isFinite(ms) && Number.isFinite(dia.getTime()) && dia.toISOString().slice(0, 10) === iso[1]
    ? ms
    : null;
}

export function formatarDataHora(ms: number) {
  return dataHora.format(ms);
}

export function formatarDia(ms: number) {
  return dataCalendario.format(diaDeCalendario(ms));
}

interface Ponto {
  instante: number;
  valor: number;
}

export function pontosValidos(medicoes: readonly MedicaoVisual[]) {
  const porInstante = new Map<number, number | null>();
  for (const { data, valor } of medicoes) {
    const ms = instante(data);
    if (ms === null || valor === null || !Number.isFinite(valor)) continue;

    // Duplicados iguais contam uma vez. Valores diferentes no mesmo instante são ambíguos.
    porInstante.set(ms, porInstante.has(ms) && porInstante.get(ms) !== valor ? null : valor);
  }

  const pontos: Ponto[] = [];
  for (const [ms, valor] of porInstante) {
    if (valor !== null) pontos.push({ instante: ms, valor });
  }
  return pontos.sort((a, b) => a.instante - b.instante);
}

export function intervaloValido(intervalo?: IntervaloVisual) {
  return intervalo && intervalo.every(Number.isFinite) && intervalo[0] < intervalo[1]
    ? intervalo
    : undefined;
}

const largura = 300;
const altura = 84;
const margem = 6;

export const dimensoesGrafico = { largura, altura, margem };

export function modeloTendencia(
  medicoes: readonly MedicaoVisual[],
  referencia?: IntervaloVisual,
  amplitudeMinima = 0,
) {
  const pontos = pontosValidos(medicoes);
  const primeiro = pontos[0];
  const ultimo = pontos.at(-1);
  const faixa = intervaloValido(referencia);
  if (!primeiro || !ultimo) return null;
  if (pontos.length === 1) return { ultimo, faixa, serie: null };

  let minimo = faixa ? Math.min(primeiro.valor, faixa[0]) : primeiro.valor;
  let maximo = faixa ? Math.max(primeiro.valor, faixa[1]) : primeiro.valor;
  for (const { valor } of pontos) {
    minimo = Math.min(minimo, valor);
    maximo = Math.max(maximo, valor);
  }

  // Margem proporcional e piso de amplitude visual. Nenhum destes define limites de saúde.
  const variacao = maximo - minimo;
  const piso = Number.isFinite(amplitudeMinima) ? amplitudeMinima : 0;
  const amplitude = Math.max(variacao * 1.18, Math.abs(minimo) * 0.1, Math.abs(maximo) * 0.1, piso);
  const folga = ((amplitude || 1) - variacao) / 2;
  const inferior = minimo - folga;
  const superior = maximo + folga;
  const y = (valor: number) => altura - margem - (valor - inferior) / (superior - inferior) * (altura - 2 * margem);
  const duracao = ultimo.instante - primeiro.instante;
  const coordenadas = pontos.map((ponto) => ({
    x: margem + (ponto.instante - primeiro.instante) / duracao * (largura - 2 * margem),
    y: y(ponto.valor),
  }));
  const coordenada = (n: number) => n.toFixed(2);

  // A curva passa pelos pontos e cada segmento fica dentro da amplitude dos seus extremos.
  const linha = coordenadas.map((ponto, i) => {
    const x = coordenada(ponto.x);
    const atual = coordenada(ponto.y);
    if (i === 0) return `M${x},${atual}`;
    const anterior = coordenadas[i - 1];
    const meio = coordenada((anterior.x + ponto.x) / 2);
    return `C${meio},${coordenada(anterior.y)} ${meio},${atual} ${x},${atual}`;
  }).join(" ");

  const variacaoLiquida = ultimo.valor - primeiro.valor;
  return {
    ultimo,
    faixa,
    serie: {
      primeiro,
      pontos: coordenadas,
      linha,
      dominio: [inferior, superior] as const,
      banda: faixa ? { y: y(faixa[1]), altura: y(faixa[0]) - y(faixa[1]) } : undefined,
      variacao: variacaoLiquida,
      variacaoFormatada: numeroComSinal.format(variacaoLiquida),
    },
  };
}

function diaDeCalendario(ms: number) {
  return Date.parse(diaLisboa.format(ms));
}

export function modeloTpa(ultimaTpa: string | null | undefined, agora: string, intervaloDias?: number | null) {
  const ultima = ultimaTpa ? instante(ultimaTpa) : null;
  const atual = instante(agora);
  if (ultima === null || atual === null || ultima > atual) return null;

  const diaUltima = diaDeCalendario(ultima);
  const dias = (diaDeCalendario(atual) - diaUltima) / diaMs;
  const prevista = diaUltima + (intervaloDias ?? 0) * diaMs;
  const agenda = intervaloDias && Number.isSafeInteger(intervaloDias) && intervaloDias > 0
    && Number.isFinite(new Date(prevista).getTime())
    ? {
        intervalo: intervaloDias,
        data: new Date(prevista).toISOString().slice(0, 10),
        dataFormatada: dataCalendario.format(prevista),
        progresso: Math.min(1, dias / intervaloDias),
        estado: dias > intervaloDias ? "Prazo ultrapassado" : dias === intervaloDias ? "Prevista para hoje" : "Próxima prevista",
      }
    : null;
  return { ultima, dias, agenda };
}
