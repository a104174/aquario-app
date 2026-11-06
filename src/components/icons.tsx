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

export const IconCasa = (p: P) => (
  <Base {...p}>
    <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />
  </Base>
);

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

export const IconCaixa = (p: P) => (
  <Base {...p}>
    <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" />
    <path d="M4 8.5 12 13l8-4.5M12 13v7" />
  </Base>
);

export const IconEstrela = (p: P) => (
  <Base {...p}>
    <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 15.9 7.1 18.6l1.1-5.3-4-3.7 5.4-.6z" />
  </Base>
);

export const IconMala = (p: P) => (
  <Base {...p}>
    <rect x="4" y="7.5" width="16" height="12" rx="2.5" />
    <path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M9 11v5M15 11v5" />
  </Base>
);

export const IconGlobo = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5S14.3 18.1 12 20.5C9.7 18.1 8.6 15.3 8.6 12S9.7 5.9 12 3.5Z" />
  </Base>
);

export const IconLink = (p: P) => (
  <Base {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Base>
);

export const IconBebe = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="11" cy="15.5" r=".9" fill="currentColor" stroke="none" />
    <path d="M4 12c2-5 9-7 14-3l2-2v8l-2-2c-5 4-12 2-14-1" />
  </Base>
);
