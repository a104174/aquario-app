"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cx } from "@/lib/cx";

/**
 * Bottom sheet (vaul). Usa a curva de sheet do iOS do próprio vaul
 * (500ms, cubic-bezier(.32,.72,0,1)) e escala o fundo como no iOS
 * (shouldScaleBackground + [data-vaul-drawer-wrapper] no shell).
 */
export function Sheet({
  open,
  onOpenChange,
  titulo,
  esquerda,
  direita,
  rodape,
  children,
  nested,
  onAnimationEnd,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: ReactNode;
  esquerda?: ReactNode;
  direita?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
  nested?: boolean;
  onAnimationEnd?: (open: boolean) => void;
  className?: string;
}) {
  const Root = nested ? Drawer.NestedRoot : Drawer.Root;
  return (
    <Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={!nested}
      noBodyStyles
      repositionInputs
      onAnimationEnd={onAnimationEnd}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40" />
        <Drawer.Content
          aria-describedby={undefined}
          className={cx(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-var(--safe-top)-10px)] max-w-lg flex-col",
            "rounded-t-[20px] bg-bg outline-none",
            className,
          )}
        >
          <Drawer.Handle className="!mt-2 !h-[5px] !w-9 !bg-[var(--text-3)] !opacity-40" />
          <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2">
            <div className="flex justify-start">{esquerda}</div>
            <Drawer.Title className="truncate text-center text-[17px] font-semibold">{titulo}</Drawer.Title>
            <div className="flex justify-end">{direita}</div>
          </div>
          <div className="scroll-area min-h-0 flex-1 px-4 pb-4" data-vaul-no-drag={undefined}>
            {children}
          </div>
          {rodape && (
            <div className="shrink-0 border-t border-separator bg-bg px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3">
              {rodape}
            </div>
          )}
          {!rodape && <div className="h-[var(--safe-bottom)] shrink-0" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Root>
  );
}

export function BotaoSheet({
  children,
  onClick,
  forte,
  disabled,
  type = "button",
  form,
}: {
  children: ReactNode;
  onClick?: () => void;
  forte?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  form?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "pressable rounded-lg px-2 py-2 text-[17px] text-accent disabled:opacity-40",
        forte && "font-semibold",
      )}
    >
      {children}
    </button>
  );
}
