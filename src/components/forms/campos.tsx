"use client";

import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { IconMais } from "@/components/icons";
import { cx } from "@/lib/cx";
import { vibrar } from "@/lib/haptic";
import { focarDepoisDaAnimacao } from "@/lib/teclado";
import type { Aquario } from "@/lib/tipos";

/** Grupo estilo "inset grouped" do iOS. */
export function Grupo({ titulo, rodape, children }: { titulo?: string; rodape?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-5">
      {titulo && <p className="mb-1.5 px-4 text-footnote uppercase tracking-wide text-text-2">{titulo}</p>}
      <div className="overflow-hidden rounded-[14px] bg-surface">{children}</div>
      {rodape && <p className="mt-1.5 px-4 text-footnote text-text-2">{rodape}</p>}
    </div>
  );
}

/** Linha de um grupo: rótulo à esquerda, controlo à direita. */
export function Linha({ rotulo, children, htmlFor }: { rotulo: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="relative flex min-h-[48px] items-center gap-3 px-4 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator last:after:hidden"
    >
      <span className="shrink-0 text-body">{rotulo}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </label>
  );
}

export function InputLinha({ className, autoFocus, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const texto = !props.type || props.type === "text";
  const ref = useRef<HTMLInputElement>(null);
  // autoFocus só depois de a sheet/passo acabar de animar (ver lib/teclado)
  useEffect(() => {
    if (autoFocus && ref.current) void focarDepoisDaAnimacao(ref.current);
  }, [autoFocus]);
  return (
    <input
      ref={ref}
      autoComplete="off"
      autoCapitalize={texto && props.inputMode !== "decimal" && props.inputMode !== "url" ? "sentences" : "off"}
      autoCorrect={texto && !props.inputMode ? "on" : "off"}
      {...props}
      className={cx(
        "h-[48px] w-full min-w-0 bg-transparent text-right text-body text-text outline-none placeholder:text-text-3",
        className,
      )}
    />
  );
}

/** Campo numérico com vírgula ou ponto (teclado decimal do iOS). */
export function InputNumero({
  valor,
  onValor,
  unidade,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  valor: string;
  onValor: (v: string) => void;
  unidade?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <InputLinha
        autoCorrect="off"
        autoCapitalize="off"
        {...props}
        inputMode="decimal"
        value={valor}
        onChange={(e) => onValor(e.target.value.replace(/[^0-9.,]/g, ""))}
        className="w-24"
      />
      {unidade && <span className="text-subhead text-text-3">{unidade}</span>}
    </span>
  );
}

export function AreaNotas({ valor, onValor, placeholder = "Notas" }: { valor: string; onValor: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={valor}
      onChange={(e) => onValor(e.target.value)}
      placeholder={placeholder}
      enterKeyHint="enter"
      autoCapitalize="sentences"
      rows={3}
      className="block w-full resize-none bg-transparent px-4 py-3 text-body outline-none placeholder:text-text-3"
    />
  );
}

/**
 * Controlo segmentado com "polegar" que desliza entre opções
 * (posição, 280ms, curva de assinatura) — como o UISegmentedControl.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onValor,
  className,
}: {
  opcoes: { valor: T; texto: ReactNode }[];
  valor: T;
  onValor: (v: T) => void;
  className?: string;
}) {
  const i = Math.max(0, opcoes.findIndex((o) => o.valor === valor));
  return (
    <div
      role="tablist"
      className={cx("relative grid rounded-[10px] bg-surface-3 p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-[8px] bg-surface shadow-[0_1px_4px_rgb(0_0_0/0.12)] transition-transform duration-[var(--dur-std)] ease-[var(--ease-out)]"
        style={{ width: `calc((100% - 4px) / ${opcoes.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={o.valor === valor}
          onClick={() => {
            if (o.valor !== valor) vibrar("leve");
            onValor(o.valor);
          }}
          className={cx(
            "relative z-10 h-11 truncate px-1 text-subhead font-medium transition-colors duration-[var(--dur-quick)]",
            o.valor === valor ? "text-text" : "text-text-2",
          )}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/** Chips horizontais (escolha única), com scroll lateral. */
export function Chips<T extends string>({
  opcoes,
  valor,
  onValor,
}: {
  opcoes: { valor: T; texto: ReactNode }[];
  valor: T | null;
  onValor: (v: T) => void;
  /** (compatibilidade: o header já não é escuro; ignorado) */
  escuro?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Garante que o chip escolhido fica visível
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [valor]);
  return (
    <div ref={ref} className="scroll-area -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onValor(o.valor)}
            className={cx(
              "pressable h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-subhead font-medium",
              // (o header deixou de ser escuro: `escuro` mantém-se só por compatibilidade)
              ativo
                ? "bg-accent text-accent-contrast shadow-[var(--shadow-botao)]"
                : "bg-surface text-text shadow-[0_0_0_1px_var(--separator)]",
            )}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}

export function SeletorAquario({
  aquarios,
  valor,
  onValor,
}: {
  aquarios: Aquario[];
  valor: string | null;
  onValor: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-4 text-footnote uppercase tracking-wide text-text-2">Aquário</p>
      <Chips opcoes={aquarios.map((a) => ({ valor: a.id, texto: a.nome }))} valor={valor} onValor={onValor} />
    </div>
  );
}

/** Stepper − n + (toque e mantém não é preciso para quantidades pequenas). */
export function Stepper({
  valor,
  onValor,
  min = 1,
  max = 999,
  sufixo,
}: {
  valor: number;
  onValor: (v: number) => void;
  min?: number;
  max?: number;
  sufixo?: string;
}) {
  const [k, setK] = useState(0);
  const mudar = (d: number) => {
    const n = Math.min(max, Math.max(min, valor + d));
    if (n !== valor) {
      vibrar("leve");
      onValor(n);
      setK((x) => x + 1);
    }
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Menos"
        onClick={() => mudar(-1)}
        disabled={valor <= min}
        className="pressable flex h-11 w-11 items-center justify-center rounded-l-[11px] bg-surface-3 text-title2 disabled:opacity-40"
      >
        −
      </button>
      <span key={k} className="pop-in min-w-[3ch] text-center text-body font-semibold tabular-nums">
        {valor}
        {sufixo}
      </span>
      <button
        type="button"
        aria-label="Mais"
        onClick={() => mudar(1)}
        disabled={valor >= max}
        className="pressable flex h-11 w-11 items-center justify-center rounded-r-[11px] bg-surface-3 disabled:opacity-40"
      >
        <IconMais size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}

/** Interruptor estilo iOS. O polegar desliza com a curva de assinatura. */
export function Interruptor({
  ligado,
  onMudar,
  disabled,
  label,
}: {
  ligado: boolean;
  onMudar: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  // Pista com o tamanho do UISwitch (51×31) dentro de uma área de toque de 44 px
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        vibrar("leve");
        onMudar(!ligado);
      }}
      className="group flex h-11 w-[55px] shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span
        className={cx(
          "relative h-[31px] w-[51px] rounded-full transition-colors duration-[var(--dur-std)] ease-[var(--ease-out)]",
          ligado ? "bg-ok" : "bg-surface-3",
        )}
      >
        {/* Ao premir, o botão estica (como o UISwitch) para o lado de dentro */}
        <span
          className={cx(
            "absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)]",
            "transition-[translate,width] duration-[var(--dur-std)] ease-[var(--ease-out)] group-active:w-[33px]",
            ligado ? "translate-x-[20px] group-active:translate-x-[14px]" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

export function ErroForm({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="shake mb-4 rounded-xl bg-danger-soft px-4 py-3 text-subhead text-danger">
      {texto}
    </p>
  );
}
