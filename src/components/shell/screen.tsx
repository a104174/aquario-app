"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, ViewTransition, type ReactNode } from "react";
import { IconChevronEsquerda } from "@/components/icons";
import { cx } from "@/lib/cx";
import { useMemoriaScroll, usePuxarParaAtualizar, useSwipeVoltar } from "@/lib/gestos";
import { useNavegar } from "./nav";
import { EstadoSync } from "./estado-sync";

const DIRECIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-tab": "nav-tab", default: "none" };

/**
 * Ecrã: header fixo, large title que colapsa no scroll como no iOS e um
 * único container de scroll. Claro por defeito (título carvão sobre o
 * fundo); com `fundoHero` (fotografia) passa a editorial: texto branco
 * sobre a foto e o conteúdo sobe numa folha arredondada.
 * O conteúdo entra/sai com View Transitions conforme o tipo de navegação.
 */
export function Screen({
  titulo,
  subtitulo,
  voltar,
  acoes,
  hero,
  fundoHero,
  children,
  puxarParaAtualizar = true,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  voltar?: { href: string; texto: string };
  acoes?: ReactNode;
  /** Conteúdo extra dentro da zona oceano, por baixo do título. */
  hero?: ReactNode;
  /** Fundo opcional, de margem a margem, atrás do título e do hero. */
  fundoHero?: ReactNode;
  children: ReactNode;
  /** Puxar para atualizar (por defeito volta a pedir os dados visíveis). */
  puxarParaAtualizar?: boolean | (() => Promise<unknown>);
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const ecraRef = useRef<HTMLDivElement>(null);
  const ptrRef = useRef<HTMLDivElement>(null);
  const [compacto, setCompacto] = useState(false);
  const navegar = useNavegar();
  const qc = useQueryClient();
  const temFundoHero = !!fundoHero;

  const atualizar = useCallback(
    () => (typeof puxarParaAtualizar === "function" ? puxarParaAtualizar() : qc.refetchQueries({ type: "active" })),
    [puxarParaAtualizar, qc],
  );
  const voltarHref = voltar?.href;
  const aoVoltar = useCallback(() => voltarHref && navegar(voltarHref, "back"), [voltarHref, navegar]);

  useMemoriaScroll(scrollRef);
  usePuxarParaAtualizar(scrollRef, ptrRef, puxarParaAtualizar ? atualizar : null);
  useSwipeVoltar(ecraRef, voltar ? aoVoltar : null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const titulo = tituloRef.current;
        const header = headerRef.current;
        setCompacto(temFundoHero && titulo && header
          ? titulo.getBoundingClientRect().top <= header.getBoundingClientRect().bottom
          : el.scrollTop > 36);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    if (temFundoHero) onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [temFundoHero]);

  return (
    <ViewTransition enter={DIRECIONAL} exit={DIRECIONAL} default="none">
      <div
        ref={ecraRef}
        className="absolute inset-0"
        style={{ background: temFundoHero ? "linear-gradient(#141517 50%, var(--bg) 50%)" : "var(--bg)" }}
      >
        {/* Indicador de "puxar para atualizar" */}
        {puxarParaAtualizar && (
          <div ref={ptrRef} className="ptr" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M20 12a8 8 0 1 1-2.34-5.66" />
              <path d="M20 4v5h-5" />
            </svg>
          </div>
        )}
        {/* Header fixo */}
        <header
          ref={headerRef}
          style={{ viewTransitionName: "app-header" }}
          className={cx(
            "absolute inset-x-0 top-0 z-20 pt-[var(--safe-top)]",
            "transition-[background-color,box-shadow,color] duration-[var(--dur-std)] ease-[var(--ease-out)]",
            compacto
              ? "bg-[var(--tabbar)] text-text shadow-[0_0.5px_0_var(--separator)] backdrop-blur-xl backdrop-saturate-150"
              : temFundoHero
                ? "bg-transparent text-white"
                : "bg-transparent text-text",
          )}
        >
          <div className="barra-header relative flex h-11 items-center justify-between px-2">
            <div className="flex min-w-[88px] items-center">
              {voltar && (
                <button
                  type="button"
                  aria-label={voltar.texto}
                  onClick={() => navegar(voltar.href, "back")}
                  className="botao-circular pressable"
                >
                  <IconChevronEsquerda size={22} strokeWidth={2.2} />
                </button>
              )}
            </div>
            <h2
              aria-hidden={!compacto}
              className={cx(
                "pointer-events-none absolute inset-x-[108px] truncate text-center text-[17px] font-semibold",
                "transition-[opacity,transform] duration-[var(--dur-std)] ease-[var(--ease-out)]",
                compacto ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              {titulo}
            </h2>
            <div className="flex min-w-[88px] items-center justify-end gap-2">
              <EstadoSync />
              {acoes}
            </div>
          </div>
        </header>

        {/* Único container de scroll do ecrã */}
        <div
          ref={scrollRef}
          className="scroll-area screen-enter absolute inset-0"
          style={{ background: temFundoHero ? "linear-gradient(#141517 50%, var(--bg) 50%)" : "var(--bg)" }}
        >
          <div className={cx("header-ambient px-5 pt-[calc(var(--safe-top)+48px)]", temFundoHero ? "pb-9 text-white" : "pb-5 text-text")}>
            {fundoHero}
            <div className={temFundoHero ? "pointer-events-none relative pt-[clamp(56px,20vw,100px)] [@media(orientation:landscape)_and_(max-height:500px)]:pt-5" : undefined}>
              <h1
                ref={tituloRef}
                className={cx(
                  "origin-left text-[34px] font-bold leading-[1.1] tracking-[-0.025em]",
                  "transition-[opacity,transform] duration-[var(--dur-std)] ease-[var(--ease-out)]",
                  temFundoHero && "[text-shadow:0_2px_10px_#020a10]",
                  compacto && "opacity-0",
                )}
              >
                {titulo}
              </h1>
              {subtitulo && <div className={cx("mt-1 text-[15px]", temFundoHero ? "text-white/75" : "text-text-2")}>{subtitulo}</div>}
              {hero}
            </div>
          </div>
          <main
            className={cx(
              "conteudo-ecra relative min-h-[calc(100%-var(--safe-top)-60px)] bg-bg px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)]",
              temFundoHero ? "-mt-5 rounded-t-[28px] pt-5" : "pt-2",
            )}
          >
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
        <div className="mb-2.5 flex items-end justify-between px-1">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-text">{titulo}</h2>
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
      className="botao-circular pressable"
    >
      {children}
    </button>
  );
}
