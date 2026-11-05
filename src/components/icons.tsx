// Ícones em linha, estilo SF Symbols (traço 1.8, cantos redondos).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconAquario = (p: P) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3 9.5c2 1.2 4 1.2 6 0s4-1.2 6 0 4 1.2 6 0" />
    <path d="M8.5 15.2c1.2-1.5 3.3-1.6 4.6-.2l1.4-1v3l-1.4-1c-1.3 1.4-3.4 1.3-4.6-.2" />
  </Base>
);

export const IconMais = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconMaisCirculo = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </Base>
);

export const IconHistorico = (p: P) => (
  <Base {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </Base>
);

export const IconDefinicoes = (p: P) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
);

export const IconGota = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />
  </Base>
);

export const IconTubo = (p: P) => (
  <Base {...p}>
    <path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3" />
    <path d="M10 11h4" />
  </Base>
);

export const IconPeixe = (p: P) => (
  <Base {...p}>
    <path d="M3 12c2.5-4 8-5.5 12-2l4-3v10l-4-3c-4 3.5-9.5 2-12-2Z" />
    <circle cx="7.5" cy="11.2" r=".6" fill="currentColor" />
  </Base>
);

export const IconCamara = (p: P) => (
  <Base {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
    <circle cx="12" cy="13.2" r="3.4" />
  </Base>
);

export const IconChevronDireita = (p: P) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);

export const IconChevronEsquerda = (p: P) => (
  <Base {...p}>
    <path d="m15 5-7 7 7 7" />
  </Base>
);

export const IconMaisOpcoes = (p: P) => (
  <Base {...p}>
    <circle cx="5.5" cy="12" r=".9" fill="currentColor" />
    <circle cx="12" cy="12" r=".9" fill="currentColor" />
    <circle cx="18.5" cy="12" r=".9" fill="currentColor" />
  </Base>
);

export const IconVisto = (p: P) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);

export const IconTermometro = (p: P) => (
  <Base {...p}>
    <path d="M14 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0Z" />
  </Base>
);

export const IconSino = (p: P) => (
  <Base {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Base>
);

export const IconSair = (p: P) => (
  <Base {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 8 6 12l4 4M6 12h10" />
  </Base>
);

export const IconFiltro = (p: P) => (
  <Base {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Base>
);

export const IconNuvemOff = (p: P) => (
  <Base {...p}>
    <path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18Z" />
    <path d="m4 4 16 16" />
  </Base>
);
