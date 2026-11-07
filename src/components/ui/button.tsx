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
        "inline-flex h-[52px] items-center justify-center gap-2 px-6 text-body font-bold tracking-[-0.01em]",
        "disabled:opacity-45",
        block && "w-full",
        // primário e secundário com relevo (lábio que afunda ao toque)
        variant === "primary" && "botao-relevo botao-primario",
        variant === "secondary" && "botao-relevo botao-secundario",
        variant === "ghost" && "pressable rounded-full bg-transparent text-accent",
        variant === "danger" && "botao-relevo botao-perigo",
        className,
      )}
    >
      {loading ? <span className="opacity-70">{children}</span> : children}
    </button>
  );
}
