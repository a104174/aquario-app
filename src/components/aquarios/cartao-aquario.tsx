"use client";

import { IconChevronDireita, IconPeixe } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { cx } from "@/lib/cx";
import { estadoTpa, faunaAtual, ultimaTpa, ultimosValores } from "@/lib/derivados";
import { diasDesde, num, plural, textoHaDias } from "@/lib/formato";
import { INFO_PARAMETROS } from "@/lib/parametros";
import type { Aquario, FaunaEvento, Medicao, Parametro, Tpa } from "@/lib/tipos";

const PRIORIDADE: Parametro[] = ["no3", "ph", "temperatura_c", "no2", "nh3_nh4", "kh", "gh"];

export function CartaoAquario({
  aquario,
  tpas,
  medicoes,
  fauna,
  intervalo,
  indice,
}: {
  aquario: Aquario;
  tpas?: Tpa[];
  medicoes?: Medicao[];
  fauna?: FaunaEvento[];
  intervalo: number;
  indice: number;
}) {
  const tpa = ultimaTpa(tpas, aquario.id);
  const { estado, dias } = estadoTpa(tpa, intervalo);
  const valores = ultimosValores(medicoes, aquario.id);
  const params = PRIORIDADE.filter((p) => valores[p]).slice(0, 4);
  const ultimaMedicao = params.length ? Math.max(...params.map((p) => new Date(valores[p]!.data).getTime())) : null;
  const { lista, total } = faunaAtual(fauna, aquario.id);
  const progresso = dias === null ? 0 : Math.min(1, dias / intervalo);

  const textoTpa =
    estado === "nunca"
      ? "Ainda sem TPAs"
      : estado === "atrasada"
        ? `TPA em atraso · última ${textoHaDias(dias!)}`
        : `Última TPA ${textoHaDias(dias!)}`;

  return (
    <NavLink
      href={`/aquario?id=${aquario.id}`}
      tipo="forward"
      style={{ ["--i" as string]: indice }}
      className="pressable enter-up block rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-[19px] font-semibold leading-snug">{aquario.nome}</h2>
          <p className="text-[14px] text-text-2">
            {[
              aquario.volume_util_l != null && `${num(aquario.volume_util_l, 1)} L úteis`,
              aquario.volume_bruto_l != null && `${num(aquario.volume_bruto_l, 1)} L brutos`,
            ]
              .filter(Boolean)
              .join(" · ") || "Volume por definir"}
          </p>
        </div>
        <IconChevronDireita size={20} className="mt-1 shrink-0 text-text-3" />
      </div>

      {/* Ciclo de TPA: medidor cuja cor acompanha a urgência */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[14px]">
          <span className={cx("font-medium", estado === "atrasada" ? "text-danger" : "text-text")}>
            {estado === "atrasada" && <span aria-hidden>⚠︎ </span>}
            {textoTpa}
          </span>
          {estado !== "nunca" && <span className="tabular-nums text-text-3">{Math.min(dias!, 99)}/{intervalo} d</span>}
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cx(
              "h-full origin-left rounded-full transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)]",
              estado === "atrasada" ? "bg-danger" : estado === "quase" ? "bg-warning" : "bg-accent",
            )}
            style={{ transform: `scaleX(${estado === "nunca" ? 0 : Math.max(0.04, progresso)})` }}
          />
        </div>
      </div>

      {params.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-4 gap-1.5">
            {params.map((p) => {
              const info = INFO_PARAMETROS[p];
              const v = valores[p]!.valor;
              const f = info.faixa(v);
              return (
                <div
                  key={p}
                  className={cx(
                    "rounded-[10px] px-2 py-1.5",
                    f === "ok" ? "bg-surface-2" : f === "atencao" ? "bg-warning-soft" : "bg-danger-soft",
                  )}
                >
                  <p className="text-[11px] text-text-2">
                    {info.curto}
                    {f !== "ok" && <span aria-label="fora da referência"> !</span>}
                  </p>
                  <p className="text-[16px] font-semibold tabular-nums leading-tight">{num(v, info.decimais)}</p>
                </div>
              );
            })}
          </div>
          {ultimaMedicao && (
            <p className="mt-1.5 text-[12px] text-text-3">Medido {textoHaDias(diasDesde(new Date(ultimaMedicao).toISOString()))}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-separator pt-3 text-[14px] text-text-2">
        <IconPeixe size={18} className="text-text-3" />
        {total > 0 ? (
          <span className="truncate">
            {plural(total, "animal", "animais")} · {plural(lista.length, "espécie", "espécies")}
          </span>
        ) : (
          <span>Sem fauna registada</span>
        )}
      </div>
    </NavLink>
  );
}
