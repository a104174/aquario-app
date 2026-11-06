/**
 * Glifos SVG próprios do widget de aquário (leves, sem biblioteca).
 * Todos usam currentColor / var(--tom) para seguirem o tema e o tom do aquário.
 */

/** Aquário abstrato: vidro + água ao nível útil/bruto + duas bolhas. */
export function GlifoAquario({ nivel, className }: { nivel: number | null; className?: string }) {
  // nível 0..1 (útil / bruto); sem dados → 0,7 desenhado a tracejado (neutro)
  const n = nivel === null ? 0.7 : Math.min(1, Math.max(0.15, nivel));
  const topo = 6 + (1 - n) * 30;
  return (
    <svg viewBox="0 0 48 44" className={className} aria-hidden>
      <path
        d={`M5 ${topo} Q 13 ${topo - 2.2} 21 ${topo} T 37 ${topo} T 43 ${topo - 0.6} V 38 a3 3 0 0 1 -3 3 H 8 a3 3 0 0 1 -3 -3 Z`}
        fill="var(--tom)"
        opacity={nivel === null ? 0.18 : 0.32}
      />
      <path
        d="M4 4 V38 a4 4 0 0 0 4 4 H40 a4 4 0 0 0 4 -4 V4"
        fill="none"
        stroke="var(--tom)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={nivel === null ? "3 3" : undefined}
      />
      <circle cx="14" cy={Math.min(34, topo + 12)} r="1.8" fill="var(--tom)" opacity="0.7" />
      <circle cx="19" cy={Math.min(36, topo + 18)} r="1.2" fill="var(--tom)" opacity="0.5" />
    </svg>
  );
}

/** Peixe estilizado (fauna). `cheio` → preenchido; senão contorno. */
export function GlifoPeixe({ className, cheio = true }: { className?: string; cheio?: boolean }) {
  return (
    <svg viewBox="0 0 24 14" className={className} aria-hidden>
      <path
        d="M1.5 7 C 5 1.5, 13 0.8, 17.5 5 L 22.5 1.8 C 21.6 5.2, 21.6 8.8, 22.5 12.2 L 17.5 9 C 13 13.2, 5 12.5, 1.5 7 Z"
        fill={cheio ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={cheio ? 0 : 1.4}
        strokeLinejoin="round"
      />
      {cheio && <circle cx="6" cy="6.2" r="1.1" fill="var(--surface)" />}
    </svg>
  );
}

/** Seta de tendência (sobe / desce / estável). */
export function GlifoTendencia({ sentido, className }: { sentido: -1 | 0 | 1; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {sentido === 0 ? (
        <path d="M2.5 6 H9.5 M7.2 3.8 L9.5 6 L7.2 8.2" />
      ) : (
        <g transform={sentido === 1 ? undefined : "rotate(90 6 6)"}>
          <path d="M3 9 L9 3 M4.6 3 H9 V7.4" />
        </g>
      )}
    </svg>
  );
}

/** Tubo de ensaio vazio: sem medições. */
export function GlifoTeste({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 20" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2 H11 M6 2 V14.5 a2 2 0 0 0 4 0 V2" />
      <path d="M6 10 H10" opacity="0.5" />
    </svg>
  );
}
