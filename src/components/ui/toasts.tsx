"use client";

import { fecharToast, useToasts } from "@/lib/toast";
import { cx } from "@/lib/cx";

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+12px)] z-[80] flex flex-col-reverse items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => fecharToast(t.id)}
          className={cx(
            "pointer-events-auto flex max-w-sm items-center gap-3 rounded-full py-2.5 pl-4 text-[15px] font-medium shadow-lg backdrop-blur-xl",
            t.acao ? "pr-2" : "pr-4",
            t.saindo ? "toast-exit" : "toast-enter",
            t.tipo === "erro" && "bg-danger text-white",
            t.tipo === "ok" && "bg-surface/95 text-text",
            t.tipo === "info" && "bg-surface/95 text-text",
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
              className="pressable rounded-full bg-accent-soft px-3 py-1 text-[15px] font-semibold text-accent"
            >
              {t.acao.texto}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
