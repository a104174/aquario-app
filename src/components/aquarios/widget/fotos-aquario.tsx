"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { dataCurta } from "@/lib/formato";
import { useFotoUrl } from "@/lib/query/dados";
import type { Foto } from "@/lib/tipos";
import { abrirVisualizador } from "@/lib/visualizador-store";
import "./widget.css";

/**
 * Faixa panorâmica (2:1) com as fotos do aquário. Uma foto → imagem simples;
 * várias → carrossel com scroll-snap nativo (swipe do iPhone, inércia e
 * bloqueio de direção do próprio Safari) e pontos de paginação.
 * Tocar abre o visualizador; o swipe nunca navega para o detalhe.
 */
export function FotosAquario({ fotos, nome }: { fotos: Foto[]; nome: string }) {
  const faixa = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const n = fotos.length;

  useEffect(() => {
    const el = faixa.current;
    if (!el || n < 2) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setAtual(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [n]);

  const ids = fotos.map((f) => f.id);
  const i = Math.min(atual, n - 1);

  return (
    <div className={cx("relative mt-3", "aw-interativo")}>
      <div
        ref={faixa}
        className={"aw-fotos"}
        role={n > 1 ? "region" : undefined}
        aria-roledescription={n > 1 ? "carrossel" : undefined}
        aria-label={n > 1 ? `Fotografias de ${nome}` : undefined}
      >
        {fotos.map((f, k) => (
          <Slide key={f.id} foto={f} ativa={Math.abs(k - i) <= 1} onAbrir={() => abrirVisualizador(ids, k)} rotulo={`Abrir fotografia ${k + 1} de ${n}`} />
        ))}
      </div>
      <span className="pointer-events-none absolute left-3 top-2.5 rounded-full bg-black/35 px-2 py-0.5 text-caption font-medium text-white backdrop-blur-md">
        {dataCurta(fotos[i].data)}
      </span>
      {n > 1 && (
        <div className={"aw-pontos"} aria-hidden>
          {fotos.map((f, k) => (
            <span key={f.id} className={"aw-ponto"} data-ativo={k === i ? "1" : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

function Slide({ foto, ativa, onAbrir, rotulo }: { foto: Foto; ativa: boolean; onAbrir: () => void; rotulo: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [perto, setPerto] = useState(false);
  // Só pede o URL assinado quando o cartão se aproxima do ecrã e o slide é
  // o atual ou vizinho (as restantes fotos não gastam rede)
  useEffect(() => {
    const el = ref.current;
    if (!el || perto) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setPerto(true), { rootMargin: "300px 0px" });
    io.observe(el.parentElement ?? el);
    return () => io.disconnect();
  }, [perto]);
  const url = useFotoUrl(foto, { ativo: perto && ativa });
  const [pronta, setPronta] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const indisponivel = falhou || url.isError;

  return (
    <button ref={ref} type="button" onClick={onAbrir} aria-label={rotulo} className={cx("aw-slide", !pronta && !indisponivel && "skeleton rounded-none")}>
      {url.data && !falhou && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url.data}
          alt={foto.legenda ?? ""}
          decoding="async"
          draggable={false}
          data-pronta={pronta ? "1" : undefined}
          onLoad={() => setPronta(true)}
          onError={() => setFalhou(true)}
        />
      )}
      {indisponivel && (
        <span className="absolute inset-0 flex items-center justify-center text-footnote text-text-3">Fotografia indisponível</span>
      )}
    </button>
  );
}
