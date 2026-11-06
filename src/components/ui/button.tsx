"use client";

import { useRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  block,
  loading,
  className,
  children,
  disabled,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; loading?: boolean }) {
  // Toques repetidos (duplo toque nervoso) dentro de 800 ms são ignorados:
  // evita submeter duas vezes (ex.: duas TPAs iguais).
  const ultimo = useRef(0);
  return (
    <button
      {...rest}
      onClick={(e) => {
        const agora = performance.now();
        if (agora - ultimo.current < 800) {
          e.preventDefault();
          return;
        }
        ultimo.current = agora;
        onClick?.(e);
      }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "pressable inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-6 text-[17px] font-semibold tracking-[-0.01em]",
        "disabled:opacity-45 disabled:active:scale-100",
        block && "w-full",
        variant === "primary" && "bg-accent text-accent-contrast shadow-[var(--shadow-botao)]",
        variant === "secondary" && "bg-accent-soft text-accent-forte",
        variant === "ghost" && "bg-transparent text-accent",
        variant === "danger" && "bg-danger-soft text-danger",
        className,
      )}
    >
      {loading ? <span className="opacity-70">{children}</span> : children}
    </button>
  );
}
