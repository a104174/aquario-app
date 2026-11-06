"use client";

import { useEffect, useRef, useState } from "react";
import { useFotoUrl } from "@/lib/query/dados";
import { cx } from "@/lib/cx";
import type { Foto } from "@/lib/tipos";

type FotoMin = Pick<Foto, "id" | "storage_path"> & { thumb_path?: string | null };

/**
 * Imagem do Storage com lazy loading real: o URL assinado só é pedido
 * quando a imagem chega perto do ecrã. Skeleton até carregar; depois
 * entra com fade + leve escala (280ms, curva de assinatura).
 */
export function FotoImg({
  foto,
  className,
  alt,
  thumb,
  contain,
}: {
  foto: FotoMin;
  className?: string;
  alt?: string;
  thumb?: boolean;
  contain?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  const { data: url } = useFotoUrl(foto, { thumb, ativo: visivel });
  const [carregada, setCarregada] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && (setVisivel(true), io.disconnect()), {
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cx("relative overflow-hidden bg-surface-3", className)}>
      {!carregada && <div className="skeleton absolute inset-0 rounded-none" />}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt ?? ""}
          decoding="async"
          draggable={false}
          onLoad={() => setCarregada(true)}
          className={cx(
            "absolute inset-0 h-full w-full",
            contain ? "object-contain" : "object-cover",
            "transition-[opacity,transform] duration-[var(--dur-std)] ease-[var(--ease-out)]",
            carregada ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
          )}
        />
      )}
    </div>
  );
}
