import type { ReactNode } from "react";
import estilos from "./visual-kit.module.css";

export type TipoIconeAquario =
  | "aquario" | "peixe" | "camarao" | "caracol" | "planta"
  | "gota" | "filtro" | "termometro" | "manutencao" | "fotografia";

const desenhos: Record<TipoIconeAquario, ReactNode> = {
  aquario: <>
    <rect x="3" y="4.5" width="18" height="15" rx="2.6" />
    <path d="M3 9c2.6-1.5 4.6 1.2 7.3.1s3.5-1 5.3-.2c2 .9 3.7.3 5.4-.4M6 16.8c2.1 0 2.3-3.6 4.6-3.6 2.1 0 2.4 3.6 4.5 3.6H18" />
    <circle cx="16.4" cy="12.5" r=".8" fill="currentColor" stroke="none" />
  </>,
  peixe: <>
    <path d="M3 12.2c2.5-4.4 7.9-6.2 11.8-2.4L20 7.4c.8-.4 1.5.4 1.2 1.1l-1.1 3.7 1.1 3.6c.3.8-.4 1.5-1.2 1.1l-5.2-2.3c-3.9 3.7-9.3 2-11.8-2.4Z" />
    <path d="M11.3 11.1 10 13.6" />
    <circle cx="6.9" cy="11.8" r=".8" fill="currentColor" stroke="none" />
  </>,
  camarao: <>
    <path d="M8 9.5C9.4 4.8 15.2 4.1 18.4 7.3c4 4 .6 10.9-4.8 11.3l-1.7 2.1c-.9-.5-1.6-1.3-2-2.2-1.3-.3-2.4-.9-3.4-2l3.5-1.2c3.7.8 6.2-2.8 4-5-1.2-1.2-3.2-1-4.6.1l-4.7.3L8 9.5Z" />
    <path d="M9 7.5 5.1 5.8 2.8 6M13.4 5.5l-.7 4m5.3-2.3-3.3 3.6m5.1 1.5-4.8 1.1m2.3 3.4-3.1-1.7" />
  </>,
  caracol: <>
    <path d="M6 15.4a6 6 0 1 1 9.7-.1h2.5l.9-3.5m-.3 1.1 2.1-1.3m-2.8 3.7h.6c1.5 0 2.5 1.1 2.5 2.4v1H4.7c-1.9 0-2.5-2.2-.9-3l2.2-.3Z" />
    <path d="M7.7 10.9c0-1.6 1.3-2.9 3-2.9s2.8 1.2 2.8 2.6-1 2.3-2.2 2.3-1.8-.6-1.8-1.4" />
  </>,
  planta: <>
    <path d="M12.3 19.9c.7-4.8.4-8.3-.6-12M12.9 16.7C9.7 16.1 6.1 14.3 5 9c4.2.5 6.4 2.6 7.9 5.9m-.1-.8c.8-4.5 3.4-6.4 6.3-7.1-.1 4.1-2.2 7-6.3 8.5m-.9-6.5C9 7.4 8 4.8 8.5 2.7c3.3 1 4.6 3.1 3.4 6.3ZM7.4 21h9.3" />
  </>,
  gota: <>
    <path d="M12 3.1c-2.9 4-6.6 7.5-6.6 11.5a6.6 6.6 0 0 0 13.2 0c0-4-3.7-7.5-6.6-11.5Z" />
    <path d="M8.9 14.7c0 1.5.8 2.6 2.1 3.1" />
  </>,
  filtro: <>
    <path d="M10 7V4.6a1.6 1.6 0 0 1 1.6-1.6H16m1 6h3.8m-3.8 3h2.3M7 11h6m-6 3h6m-6 3h3" />
    <rect x="4.1" y="7" width="12.8" height="13.7" rx="2.1" />
  </>,
  termometro: <>
    <path d="M9 13.8V5.6a2.7 2.7 0 0 1 5.4 0v8.2a4.2 4.2 0 1 1-5.4 0Zm2.7-3.7v6.8M17.7 6.6h2m-2 3.5h2" />
    <circle cx="11.7" cy="17.1" r="1.5" fill="currentColor" stroke="none" />
  </>,
  manutencao: <>
    <path d="M4.3 10.8A7.8 7.8 0 0 1 17 5.7l2.6 2.6m0-4.2v4.2h-4.2m4.3 4.9A7.8 7.8 0 0 1 7 18.3l-2.6-2.6m0 4.2v-4.2h4.2M12 8.8c-1.2 1.7-2.5 3-2.5 4.3a2.5 2.5 0 0 0 5 0c0-1.3-1.3-2.6-2.5-4.3Z" />
  </>,
  fotografia: <>
    <path d="M5.1 6.9h3l1.4-2.1h5l1.4 2.1h3A2.1 2.1 0 0 1 21 9v8.1a2.1 2.1 0 0 1-2.1 2.1H5.1A2.1 2.1 0 0 1 3 17.1V9a2.1 2.1 0 0 1 2.1-2.1Z" />
    <circle cx="12" cy="12.9" r="3.2" />
    <circle cx="17.8" cy="9.9" r=".7" fill="currentColor" stroke="none" />
  </>,
};

interface IconeAquarioProps {
  tipo: TipoIconeAquario;
  tamanho?: number;
  className?: string;
  /** Quando omitido, o ícone é decorativo. */
  rotulo?: string;
}

export function IconeAquario({ tipo, tamanho = 24, className, rotulo }: IconeAquarioProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
    >
      {desenhos[tipo]}
    </svg>
  );
}

type TipoFauna = Extract<TipoIconeAquario, "peixe" | "camarao" | "caracol">;
const rotulosFauna: Record<TipoFauna, string> = {
  peixe: "Peixe sem fotografia",
  camarao: "Camarão sem fotografia",
  caracol: "Caracol sem fotografia",
};

interface FaunaSemFotoProps {
  tipo?: TipoFauna;
  rotulo?: string;
  decorativo?: boolean;
  className?: string;
}

export function FaunaSemFoto({ tipo, rotulo, decorativo = false, className }: FaunaSemFotoProps) {
  return (
    <div
      className={className ? `${estilos.faunaSemFoto} ${className}` : estilos.faunaSemFoto}
      role={decorativo ? undefined : "img"}
      aria-label={decorativo ? undefined : rotulo ?? (tipo ? rotulosFauna[tipo] : "Fauna sem fotografia")}
      aria-hidden={decorativo || undefined}
    >
      <svg className={estilos.contornosFauna} viewBox="0 0 180 100" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
        <path d="M-14 82c29-3 44-25 75-24 29 0 36 16 61 12 26-4 40-23 69-27M-14 95c34-4 52-25 76-24s34 15 60 11c27-4 45-25 69-27M-8 106c27-4 45-23 70-22 25 0 37 14 62 10 26-5 39-19 67-24" stroke="currentColor" />
      </svg>
      <span className={estilos.emblemaFauna}><IconeAquario tipo={tipo ?? "aquario"} /></span>
    </div>
  );
}
