"use client";

import { fecharToast, useToasts } from "@/lib/toast";
import { cx } from "@/lib/cx";

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts pointer-events-none fixed inset-x-0 z-[80] flex flex-col-reverse items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => fecharToast(t.id)}
          className={cx(
            "pointer-events-auto flex max-w-sm items-center gap-3 rounded-full py-2.5 pl-5 text-[15px] font-medium shadow-[var(--shadow-flutuante)]",
            t.acao ? "pr-2" : "pr-4",
            t.saindo ? "toast-exit" : "toast-enter",
            t.tipo === "erro" && "bg-danger text-white",
            t.tipo === "ok" && "bg-nav text-white",
            t.tipo === "info" && "bg-nav text-white",
          )}
        >
          <span>{t.texto}</span>
          {t.acao && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                t.acao!.onClick();
                fecharToast(t.id);
              }}
              className="pressable -my-1.5 flex min-h-11 items-center rounded-full bg-white/15 px-4 text-[15px] font-semibold text-white"
            >
              {t.acao.texto}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
