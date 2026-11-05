"use client";

import { fecharToast, useToasts } from "@/lib/toast";
import { cx } from "@/lib/cx";

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+6px)] z-[80] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => fecharToast(t.id)}
          className={cx(
            "pointer-events-auto max-w-sm rounded-full px-4 py-2.5 text-[15px] font-medium shadow-lg backdrop-blur-xl",
            t.saindo ? "toast-exit" : "toast-enter",
            t.tipo === "erro" && "bg-danger text-white",
            t.tipo === "ok" && "bg-surface/95 text-text",
            t.tipo === "info" && "bg-surface/95 text-text",
          )}
        >
          {t.texto}
        </button>
      ))}
    </div>
  );
}
