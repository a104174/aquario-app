"use client";

import { IconNuvemOff } from "@/components/icons";
import { useOnline, usePendentes } from "@/lib/query/sincronizacao";

/** Indicador discreto: offline e/ou alterações por sincronizar. */
export function EstadoSync() {
  const online = useOnline();
  const pendentes = usePendentes();
  if (online && pendentes === 0) return null;
  return (
    <span
      className="pop-in mr-1 flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-text-2 shadow-[var(--shadow-botao)] text-[13px] font-medium"
      aria-live="polite"
    >
      {!online && <IconNuvemOff size={16} />}
      {pendentes > 0 ? `${pendentes} por enviar` : "Offline"}
    </span>
  );
}
