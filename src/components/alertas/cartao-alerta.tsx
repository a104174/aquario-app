import { IconeAlerta } from "@/components/alertas/icone-alerta";
import { apresentacaoAlerta } from "@/lib/alertas";
import { cx } from "@/lib/cx";
import { hora } from "@/lib/formato";
import type { Alerta } from "@/lib/tipos";

export function CartaoAlerta({
  alerta,
  historico = false,
  onAbrir,
  onResolver,
  onAdiar,
  onIgnorar,
}: {
  alerta: Alerta;
  historico?: boolean;
  onAbrir: () => void;
  onResolver: () => void;
  onAdiar: () => void;
  onIgnorar: () => void;
}) {
  const p = apresentacaoAlerta(alerta.tipo);

  return (
    <article className={cx("rounded-[16px] bg-surface shadow-[var(--shadow-card)]", historico && "opacity-75")}>
      <button type="button" onClick={onAbrir} className="pressable-row flex w-full items-start gap-3 rounded-[16px] px-4 py-3 text-left">
        <IconeAlerta tipo={alerta.tipo} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-text-3">{p.categoria}</span>
            <span className="shrink-0 text-[12px] tabular-nums text-text-3">{hora(alerta.criado_em)}</span>
          </span>
          <span className={cx("mt-0.5 block text-[16px] leading-snug", alerta.lido || historico ? "font-medium text-text-2" : "font-semibold")}>
            {alerta.titulo}
          </span>
          <span className="mt-0.5 block text-[14px] leading-snug text-text-2">{alerta.mensagem}</span>
          {alerta.estado === "adiado" && alerta.adiado_ate && (
            <span className="mt-2 inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-[12px] font-semibold text-warning">
              Lembrar amanhã
            </span>
          )}
        </span>
        {!alerta.lido && !historico && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Não lido" />}
      </button>

      {!historico && (
        <div className="flex items-center gap-1 border-t border-separator px-2 py-1.5">
          <button type="button" onClick={onAbrir} className="pressable min-h-11 rounded-[10px] px-2.5 text-[13px] font-semibold text-accent">
            {p.acao}
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onAdiar} className="pressable min-h-11 rounded-[10px] px-2.5 text-[13px] font-medium text-text-2">
            Amanhã
          </button>
          <button type="button" onClick={onIgnorar} className="pressable min-h-11 rounded-[10px] px-2.5 text-[13px] font-medium text-text-2">
            Ignorar
          </button>
          <button type="button" onClick={onResolver} className="pressable min-h-11 rounded-[10px] bg-accent-soft px-3 text-[13px] font-semibold text-accent">
            Já tratei
          </button>
        </div>
      )}
    </article>
  );
}
