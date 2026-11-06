import { expect, test } from "@playwright/test";
import { dimensoesGrafico, instante, modeloTendencia, modeloTpa, pontosValidos } from "../../src/components/aquarium-visual-kit/dados";

const a = "2026-10-21T12:00:00Z";
const b = "2026-10-22T12:00:00Z";
const c = "2026-10-25T12:00:00Z";
const d = "2026-10-29T12:00:00Z";

test("preserva zero, rejeita datas impossíveis e normaliza duplicados por instante", () => {
  expect(instante("2026-02-30T12:00:00Z")).toBeNull();
  expect(instante("2026-10-25T01:30:00")).toBeNull();
  expect(pontosValidos([
    { data: d, valor: 1 },
    { data: a, valor: 0 },
    { data: "2026-10-21T13:00:00+01:00", valor: 0 },
    { data: b, valor: null },
    { data: c, valor: 7 },
    { data: c, valor: 8 },
    { data: c, valor: 7 },
    { data: "inválida", valor: 10 },
    { data: b, valor: Infinity },
  ])).toEqual([
    { instante: Date.parse(a), valor: 0 },
    { instante: Date.parse(d), valor: 1 },
  ]);
});

test("distingue ausência, leitura única e série plana", () => {
  expect(modeloTendencia([])).toBeNull();
  expect(modeloTendencia([{ data: b, valor: NaN }])).toBeNull();
  expect(modeloTendencia([{ data: a, valor: 0 }])).toMatchObject({ ultimo: { valor: 0 }, serie: null });
  const plano = modeloTendencia([{ data: a, valor: 0 }, { data: c, valor: 0 }]);
  expect(plano?.serie?.variacao).toBe(0);
  expect(plano?.serie?.pontos[0].y).toBe(plano?.serie?.pontos[1].y);
});

test("posiciona as medições no eixo do tempo e preserva diferenças pequenas", () => {
  const serie = modeloTendencia([
    { data: c, valor: 7.02 }, { data: a, valor: 7 }, { data: b, valor: 7.01 },
  ], undefined, 1)?.serie;
  expect(serie).toBeTruthy();
  if (!serie) throw new Error("Série em falta");
  const { largura, margem } = dimensoesGrafico;
  expect(serie.pontos[0].x).toBe(margem);
  expect(serie.pontos[1].x).toBe(margem + (largura - 2 * margem) / 4);
  expect(serie.pontos[2].x).toBe(largura - margem);
  expect(serie.dominio[1] - serie.dominio[0]).toBeCloseTo(1);
  expect(serie.pontos[0].y - serie.pontos[2].y).toBeLessThan(2);
  expect(serie.variacaoFormatada).toBe("+0,02");
});

test("a banda usa apenas uma referência explícita e válida", () => {
  const medicoes = [{ data: a, valor: 0 }, { data: b, valor: 5 }];
  expect(modeloTendencia(medicoes, [5, 0])?.serie?.banda).toBeUndefined();
  expect(modeloTendencia(medicoes, [0, Infinity])?.serie?.banda).toBeUndefined();
  const banda = modeloTendencia(medicoes, [0, 10])?.serie?.banda;
  expect(banda?.altura).toBeGreaterThan(0);
  expect(banda?.y).toBeGreaterThanOrEqual(dimensoesGrafico.margem);
});

test("só calcula uma agenda com histórico válido e periodicidade configurada", () => {
  expect(modeloTpa(null, b, 7)).toBeNull();
  expect(modeloTpa(c, b, 7)).toBeNull();
  expect(modeloTpa(a, "inválida", 7)).toBeNull();
  for (const intervalo of [undefined, null, 0, -7, 1.5, Infinity]) {
    expect(modeloTpa(a, b, intervalo)).toMatchObject({ dias: 1, agenda: null });
  }
  expect(modeloTpa(a, b, 4)?.agenda).toMatchObject({ data: "2026-10-25", progresso: 0.25 });
  expect(modeloTpa(a, c, 4)?.agenda).toMatchObject({ estado: "Prevista para hoje", progresso: 1 });
  expect(modeloTpa(a, d, 4)?.agenda).toMatchObject({ estado: "Prazo ultrapassado", progresso: 1 });
});

test("conta dias de calendário em Lisboa na mudança de hora e à meia-noite", () => {
  expect(modeloTpa("2026-10-24T22:45:00Z", "2026-10-25T23:15:00Z", 2))
    .toMatchObject({ dias: 1, agenda: { data: "2026-10-26", progresso: 0.5 } });
  expect(modeloTpa("2026-07-09T23:15:00Z", "2026-07-10T22:59:00Z", 1))
    .toMatchObject({ dias: 0, agenda: { data: "2026-07-11", progresso: 0 } });
});
