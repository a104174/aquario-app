"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";

/**
 * Código de 6 dígitos: um único <input> (autocomplete="one-time-code",
 * para o iOS sugerir o código do Mail) desenhado como 6 caixas.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  erro,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  erro?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className={cx("relative", erro && "shake")} onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        aria-label="Código de 6 dígitos"
        className="absolute inset-0 h-full w-full opacity-0"
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(v);
          if (v.length === 6) onComplete(v);
        }}
        // Colar "123 456" ou "Código: 123456" preenche tudo e submete
        onPaste={(e) => {
          const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
          if (!v) return;
          e.preventDefault();
          onChange(v);
          if (v.length === 6) onComplete(v);
        }}
        enterKeyHint="done"
      />
      <div className="pointer-events-none grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => {
          const d = value[i];
          const ativo = i === Math.min(value.length, 5) && !disabled;
          return (
            <div
              key={i}
              className={cx(
                "flex h-14 items-center justify-center rounded-xl bg-surface-2 text-[26px] font-semibold tabular-nums",
                "transition-[box-shadow,transform] duration-[var(--dur-quick)] ease-[var(--ease-out)]",
                ativo && "shadow-[inset_0_0_0_2px_var(--accent)]",
                erro && "shadow-[inset_0_0_0_2px_var(--danger)] text-danger",
              )}
            >
              {d ? <span className="pop-in">{d}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
