import { cx } from "@/lib/cx";
import "./mascote.css";

export type Humor = "contente" | "festa" | "preocupado";

/**
 * Mascote da app: um peixinho original, derivado do logótipo (peixe com
 * ondas). Formas vetoriais simples, cores da marca e dos tokens, por isso
 * funciona em claro e escuro. Três humores, usados com parcimónia:
 * - contente: estados vazios e "em dia";
 * - festa: celebração de uma TPA feita;
 * - preocupado: atraso e erros.
 * Decorativo por omissão (o texto ao lado diz o que importa).
 */
export function Mascote({
  humor = "contente",
  tamanho = 96,
  className,
  rotulo,
  entrar = false,
}: {
  humor?: Humor;
  tamanho?: number;
  className?: string;
  rotulo?: string;
  /** entrada com mola (celebrações, estados vazios) */
  entrar?: boolean;
}) {
  const festa = humor === "festa";
  const preocupado = humor === "preocupado";
  return (
    <svg
      viewBox="0 0 120 100"
      width={tamanho}
      height={(tamanho * 100) / 120}
      className={cx("mascote", entrar && "mascote-entra", festa && "mascote-festa", className)}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      {/* bolhas (festa) */}
      {festa && (
        <g className="mascote-bolhas" fill="none" stroke="var(--agua)" strokeWidth="2.5">
          <circle cx="104" cy="30" r="5" />
          <circle cx="112" cy="14" r="3.2" />
          <circle cx="96" cy="10" r="2.4" />
        </g>
      )}
      {/* cauda */}
      <path
        className="mascote-cauda"
        d="M22 50 L4 32 Q2 30 4 29 Q14 27 26 40 Z M22 50 L4 68 Q2 70 4 71 Q14 73 26 60 Z"
        fill="var(--marca-relevo)"
      />
      {/* corpo */}
      <path d="M18 50 C 26 22, 64 14, 90 30 C 102 38, 104 62, 90 70 C 64 86, 26 78, 18 50 Z" fill="var(--marca)" />
      {/* barriga: onda da marca */}
      <path d="M26 58 C 42 52, 54 66, 70 60 S 92 56, 96 58 C 92 70, 70 82, 46 76 C 36 73, 29 66, 26 58 Z" fill="var(--mascote-barriga)" />
      {/* barbatana (levantada na festa) */}
      <path
        d={festa ? "M50 30 Q 56 6, 72 14 Q 66 22, 62 30 Z" : "M50 30 Q 58 14, 72 20 Q 66 26, 62 31 Z"}
        fill="var(--marca-relevo)"
      />
      {/* olho */}
      {festa ? (
        <path d="M72 40 Q 78 33, 84 40" fill="none" stroke="var(--mascote-tinta)" strokeWidth="3.6" strokeLinecap="round" />
      ) : (
        <g>
          <circle cx="78" cy="41" r="9" fill="#fff" />
          <circle cx={preocupado ? 80 : 79} cy={preocupado ? 43 : 42} r="4.6" fill="var(--mascote-tinta)" />
          <circle cx="81" cy="40" r="1.5" fill="#fff" />
          {preocupado && <path d="M70 29 L 86 33" stroke="var(--mascote-tinta)" strokeWidth="3" strokeLinecap="round" />}
        </g>
      )}
      {/* bochecha */}
      <ellipse cx="86" cy="55" rx="5" ry="3" fill="var(--mascote-bochecha)" />
      {/* boca */}
      {festa ? (
        <path d="M90 50 Q 98 52, 96 60 Q 90 60, 88 54 Z" fill="var(--mascote-tinta)" />
      ) : preocupado ? (
        <path d="M89 57 Q 93 54, 97 57" fill="none" stroke="var(--mascote-tinta)" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M89 53 Q 93 58, 98 54" fill="none" stroke="var(--mascote-tinta)" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* gota de suor (preocupado) */}
      {preocupado && <path d="M98 26 Q 103 34, 98 36 Q 93 34, 98 26 Z" fill="var(--agua)" opacity="0.9" />}
    </svg>
  );
}
