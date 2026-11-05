"use client";

import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  block,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "pressable inline-flex h-[50px] items-center justify-center gap-2 rounded-[14px] px-5 text-[17px] font-semibold",
        "disabled:opacity-45 disabled:active:scale-100",
        block && "w-full",
        variant === "primary" && "bg-accent text-accent-contrast",
        variant === "secondary" && "bg-accent-soft text-accent",
        variant === "ghost" && "bg-transparent text-accent",
        variant === "danger" && "bg-danger-soft text-danger",
        className,
      )}
    >
      {loading ? <span className="opacity-70">{children}</span> : children}
    </button>
  );
}
