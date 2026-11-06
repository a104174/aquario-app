"use client";

import { ParametroAgua } from "@/components/aquarium-visual-kit/parametro-agua";
import { parametrosComDados } from "@/components/aquarios/agua-manutencao";
import { IconChevronDireita } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { diasDesde, textoHaDias } from "@/lib/formato";
import { INFO_PARAMETROS } from "@/lib/parametros";
import type { Aquario, Medicao } from "@/lib/tipos";

/**
 * Início · Água: os parâmetros do aquário medido mais recentemente
 * (Aquarium Visual Kit), primeiro os que estão fora da referência.
 * Sem medições, a secção não aparece — nada é inventado.
 */
export function UltimaMedicao({ aquarios, medicoes }: { aquarios?: Aquario[]; medicoes?: Medicao[] }) {
  const recente = (medicoes ?? []).reduce<Medicao | null>((a, m) => (!a || m.data > a.data ? m : a), null);
  const aquario = recente && aquarios?.find((a) => a.id === recente.aquario_id);
  if (!recente || !aquario) return null;
  const params = parametrosComDados(medicoes, aquario.id, 2);
  if (!params.length) return null;

  return (
    <section className="mare-entrada" aria-labelledby="inicio-agua">
      <div className="mb-2.5 flex items-end justify-between gap-2">
        <h2 id="inicio-agua" className="mare-seccao !mb-0">Água</h2>
        <NavLink href={`/aquario?id=${aquario.id}`} tipo="forward" className="pressable flex min-h-11 min-w-0 items-center gap-0.5 pl-2 text-[13px] font-semibold text-text-2">
          <span className="truncate">{aquario.nome} · {textoHaDias(diasDesde(recente.data))}</span>
          <IconChevronDireita size={16} className="shrink-0" />
        </NavLink>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {params.map(({ p, l }) => (
          <ParametroAgua key={p} parametro={p} medicoes={l} referencia={INFO_PARAMETROS[p].referencia} />
        ))}
      </div>
    </section>
  );
}
