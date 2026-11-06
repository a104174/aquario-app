"use client";

import { useState } from "react";
import { CicloTrocaAgua } from "@/components/aquarium-visual-kit/ciclo-troca-agua";
import type { MedicaoVisual } from "@/components/aquarium-visual-kit/dados";
import { ParametroAgua, type ParametroVisual } from "@/components/aquarium-visual-kit/parametro-agua";
import { Seccao } from "@/components/shell/screen";
import { ultimaTpa } from "@/lib/derivados";
import { INFO_PARAMETROS } from "@/lib/parametros";
import type { Medicao, Tpa } from "@/lib/tipos";

/** Parâmetros que o kit sabe desenhar, por ordem de importância. */
const ORDEM: ParametroVisual[] = ["no3", "ph", "temperatura_c", "no2", "kh", "gh"];
/** Janela da tendência: as últimas leituras de cada parâmetro. */
const JANELA = 8;

/** Leituras reais de um parâmetro (ascendente). Ausência fica de fora; zero é leitura. */
export function leituras(medicoes: Medicao[] | undefined, aquarioId: string, p: ParametroVisual): MedicaoVisual[] {
  return (medicoes ?? [])
    .filter((m) => m.aquario_id === aquarioId && m[p] !== null && m[p] !== undefined)
    .map((m) => ({ data: m.data, valor: Number(m[p]) }))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-JANELA);
}

/** Primeiro os parâmetros fora da referência, depois pela ordem habitual. */
export function parametrosComDados(medicoes: Medicao[] | undefined, aquarioId: string, max: number) {
  const com = ORDEM.map((p) => ({ p, l: leituras(medicoes, aquarioId, p) })).filter((x) => x.l.length > 0);
  const fora = (x: (typeof com)[number]) => INFO_PARAMETROS[x.p].faixa(x.l[x.l.length - 1].valor!) !== "ok";
  return [...com.filter(fora), ...com.filter((x) => !fora(x))].slice(0, max);
}

/**
 * Detalhe do aquário: ciclo de TPA e água (Aquarium Visual Kit) logo a
 * seguir às ações, antes dos separadores. Só mostra parâmetros medidos,
 * com a faixa de referência da app; sem medições, a secção da água não
 * aparece (o ciclo de TPA tem o seu próprio estado vazio).
 */
export function AguaManutencao({ aquarioId, medicoes, tpas, intervalo }: { aquarioId: string; medicoes?: Medicao[]; tpas?: Tpa[]; intervalo: number }) {
  // instante fixo por montagem: a mesma referência para todo o cartão
  const [agora] = useState(() => new Date().toISOString());
  const params = parametrosComDados(medicoes, aquarioId, 4);

  return (
    <Seccao titulo="Água e manutenção">
      <div className="space-y-2.5">
        <CicloTrocaAgua ultimaTpa={ultimaTpa(tpas, aquarioId)?.data ?? null} intervaloDias={intervalo} agora={agora} />
        {params.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {params.map(({ p, l }) => (
              <ParametroAgua key={p} parametro={p} medicoes={l} referencia={INFO_PARAMETROS[p].referencia} />
            ))}
          </div>
        )}
      </div>
    </Seccao>
  );
}
