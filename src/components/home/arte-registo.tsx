import type { TipoRegisto } from "@/lib/ui-store";

export function ArteRegisto({ tipo }: { tipo: TipoRegisto }) {
  return (
    <svg viewBox="0 0 120 82" fill="none" aria-hidden="true" className="mare-acao-arte">
      {tipo === "tpa" && <>
        <path className="mare-arte-contexto" d="M-4 60c20-9 33-9 52 0s34 9 53 0 30-8 39-3M-4 69c20-9 33-9 52 0s34 9 53 0 30-8 39-3M-4 78c20-9 33-9 52 0s34 9 53 0 30-8 39-3" />
        <path className="mare-arte-sujeito" d="M73 12c5 9 18 19 18 31a18 18 0 0 1-36 0c0-12 13-22 18-31Z" />
        <path className="mare-arte-detalhe" d="M63 43a10 10 0 0 0 6 9M100 24v12m-6-6h12" />
      </>}
      {tipo === "medicao" && <>
        <path className="mare-arte-contexto" d="M16 62h104M16 48h104M16 34h104M16 20h104M30 14v55m17-55v55m17-55v55m17-55v55m17-55v55" />
        <g transform="rotate(23 74 40)">
          <path className="mare-arte-sujeito" d="M62 13h26v6h-4v35a9 9 0 0 1-18 0V19h-4Z" />
          <path className="mare-arte-detalhe" d="M67 37c5-4 10 4 16 0m-15 7h5m-5 7h5" />
        </g>
        <path className="mare-arte-detalhe" d="M98 48h12m-6-6v12" />
      </>}
      {tipo === "foto" && <>
        <path className="mare-arte-contexto" d="M38 30V18a5 5 0 0 1 5-5h14m30 0h14a5 5 0 0 1 5 5v12m0 18v13a5 5 0 0 1-5 5H87m-30 0H43a5 5 0 0 1-5-5V48" />
        <path className="mare-arte-sujeito" d="M48 31a4 4 0 0 1 4-4h9l4-6h14l4 6h9a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H52a4 4 0 0 1-4-4Z" />
        <circle className="mare-arte-detalhe" cx="72" cy="41" r="9" />
        <path className="mare-arte-detalhe" d="M86 33h4M72 36a5 5 0 0 0-5 5" />
      </>}
      {tipo === "fauna" && <>
        <path className="mare-arte-contexto" d="M19 64c16 0 19-15 35-15m-24 23c21 0 28-14 45-14M94 14c10 2 15 7 22 7" />
        <path className="mare-arte-sujeito" d="M39 42c15-16 34-18 49-6l15-9-2 23-13-7c-16 13-35 13-49-1Z" />
        <path className="mare-arte-detalhe" d="m63 31 12-9 7 10M57 35c4 4 4 8 1 13m17-10-7 6" />
        <circle cx="49" cy="41" r="1.8" fill="currentColor" />
        <circle className="mare-arte-detalhe" cx="32" cy="27" r="3" />
        <circle className="mare-arte-contexto" cx="23" cy="17" r="4" />
      </>}
      {tipo === "ninhada" && <>
        <path className="mare-arte-contexto" d="M32 63c12-7 22-7 34 0s22 7 34 0m-62 9c11-6 19-6 30 0s19 6 30 0" />
        <ellipse className="mare-arte-sujeito" cx="71" cy="40" rx="18" ry="21" transform="rotate(18 71 40)" />
        <path className="mare-arte-detalhe" d="M61 43c7-8 13-7 20-3l5-4v10l-5-3c-7 6-14 6-20 0Z" />
        <circle cx="67" cy="42" r="1.4" fill="currentColor" />
        <circle className="mare-arte-contexto" cx="97" cy="23" r="6" />
      </>}
    </svg>
  );
}
