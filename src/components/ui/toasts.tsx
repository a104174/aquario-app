"use client";

import { Toaster, toast as sonner } from "sonner";
import { cx } from "@/lib/cx";
import type { AcaoToast, TipoToast } from "@/lib/toast";

/**
 * Toaster único da app (Sonner, headless): o Sonner trata da posição,
 * empilhamento, swipe para fechar e interrupção; o aspeto é nosso.
 * Fica acima da navegação flutuante e, com o teclado aberto, acima dele
 * (--toast-fundo, ver globals.css). Tocar no toast já não o fecha.
 */
export function Toasts() {
  return (
    <Toaster
      position="bottom-center"
      theme="system"
      visibleToasts={3}
      // em lista (não empilhados): o "Anular" de um toast nunca fica tapado por outro
      expand
      gap={8}
      offset={{ bottom: "var(--toast-fundo)" }}
      mobileOffset={{ bottom: "var(--toast-fundo)", left: "max(16px, var(--safe-left))", right: "max(16px, var(--safe-right))" }}
      toastOptions={{ unstyled: true, className: "toast-sonner" }}
    />
  );
}

export function ToastPill({ id, texto, tipo, acao }: { id: string | number; texto: string; tipo: TipoToast; acao?: AcaoToast }) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cx(
        "mx-auto flex w-fit max-w-[min(92vw,420px)] items-center gap-2.5 rounded-full py-2.5 pl-3 text-subhead font-semibold shadow-[var(--shadow-flutuante)]",
        acao ? "pr-2" : "pr-5",
        tipo === "erro" ? "bg-danger-solido text-white" : "bg-nav text-white",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "toast-selo grid size-6 shrink-0 place-items-center rounded-full text-caption font-bold",
          tipo === "ok" ? "bg-marca text-[var(--accent-contrast)]" : tipo === "erro" ? "bg-white/20" : "bg-white/15",
        )}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {tipo === "ok" ? <path d="M3.5 8.5 6.5 11.5 12.5 4.5" /> : tipo === "erro" ? <path d="M8 3.5v5.5M8 12.2v.3" /> : <path d="M8 7v5M8 3.8v.3" />}
        </svg>
      </span>
      <span className="min-w-0">{texto}</span>
      {acao && (
        <button
          type="button"
          onClick={() => {
            acao.onClick();
            sonner.dismiss(id);
          }}
          className="pressable -my-1.5 ml-1 flex min-h-11 shrink-0 items-center rounded-full bg-white/15 px-4 text-subhead font-bold text-white"
        >
          {acao.texto}
        </button>
      )}
    </div>
  );
}
