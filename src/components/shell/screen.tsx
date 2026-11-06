"use client";

import { useEffect, useRef, useState, ViewTransition, type ReactNode } from "react";
import { IconChevronEsquerda } from "@/components/icons";
import { cx } from "@/lib/cx";
import { useNavegar } from "./nav";
import { EstadoSync } from "./estado-sync";

const DIRECIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-tab": "nav-tab", default: "none" };

/**
 * Ecrã: header fixo (sempre "oceano" por baixo da status bar), large title
 * que colapsa no scroll como no iOS e um único container de scroll.
 * O conteúdo entra/sai com View Transitions conforme o tipo de navegação.
 */
export function Screen({
  titulo,
  subtitulo,
  voltar,
  acoes,
  hero,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  voltar?: { href: string; texto: string };
  acoes?: ReactNode;
  /** Conteúdo extra dentro da zona oceano, por baixo do título. */
  hero?: ReactNode;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [compacto, setCompacto] = useState(false);
  const navegar = useNavegar();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCompacto(el.scrollTop > 36));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <ViewTransition enter={DIRECIONAL} exit={DIRECIONAL} default="none">
      <div className="absolute inset-0">
        {/* Header fixo */}
        <header
          style={{ viewTransitionName: "app-header" }}
          className={cx(
            "absolute inset-x-0 top-0 z-20 pt-[var(--safe-top)] text-white",
            "transition-[background-color,box-shadow] duration-[var(--dur-std)] ease-[var(--ease-out)]",
            compacto ? "bg-[var(--header-to)] shadow-[0_0.5px_0_rgb(255_255_255/0.12)]" : "bg-transparent",
          )}
        >
          <div className="relative flex h-11 items-center justify-between px-2">
            <div className="flex min-w-[88px] items-center">
              {voltar && (
                <button
                  type="button"
                  onClick={() => navegar(voltar.href, "back")}
                  className="pressable flex h-11 items-center gap-0.5 rounded-lg pr-2 text-[17px]"
                >
                  <IconChevronEsquerda size={26} strokeWidth={2.2} />
                  <span className="max-w-[96px] truncate">{voltar.texto}</span>
                </button>
              )}
            </div>
            <h2
              aria-hidden={!compacto}
              className={cx(
                "pointer-events-none absolute inset-x-[124px] truncate text-center text-[17px] font-semibold",
                "transition-[opacity,transform] duration-[var(--dur-std)] ease-[var(--ease-out)]",
                compacto ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              {titulo}
            </h2>
            <div className="flex min-w-[88px] items-center justify-end gap-1">
              <EstadoSync />
              {acoes}
            </div>
          </div>
        </header>

        {/* Único container de scroll do ecrã */}
        <div
          ref={scrollRef}
          className="scroll-area screen-enter absolute inset-0"
          style={{ background: "linear-gradient(var(--header-from) 50%, var(--bg) 50%)" }}
        >
          <div className="header-ambient px-5 pb-9 pt-[calc(var(--safe-top)+44px)] text-white">
            <h1
              className={cx(
                "origin-left text-[34px] font-bold leading-tight tracking-tight",
                "transition-[opacity,transform] duration-[var(--dur-std)] ease-[var(--ease-out)]",
                compacto && "opacity-0",
              )}
            >
              {titulo}
            </h1>
            {subtitulo && <div className="mt-0.5 text-[15px] text-white/70">{subtitulo}</div>}
            {hero}
          </div>
          <main className="conteudo-ecra relative -mt-5 min-h-[calc(100%-var(--safe-top)-60px)] rounded-t-[22px] bg-bg px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+32px)] pt-5">
            {children}
          </main>
        </div>
      </div>
    </ViewTransition>
  );
}

/** Secção agrupada estilo iOS (título pequeno em maiúsculas + cartão). */
export function Seccao({
  titulo,
  acao,
  children,
  className,
}: {
  titulo?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mb-6", className)}>
      {(titulo || acao) && (
        <div className="mb-2 flex items-end justify-between px-1">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-text-2">{titulo}</h3>
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function BotaoHeader({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pressable flex h-11 w-11 items-center justify-center rounded-full text-white"
    >
      {children}
    </button>
  );
}
