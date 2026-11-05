"use client";

import { useState } from "react";
import { useFotoUrl } from "@/lib/query/dados";
import { cx } from "@/lib/cx";
import type { Foto } from "@/lib/tipos";

/** Imagem de uma foto do Storage: skeleton até carregar, depois fade/scale suave. */
export function FotoImg({ foto, className, alt }: { foto: Pick<Foto, "id" | "storage_path">; className?: string; alt?: string }) {
  const { data: url } = useFotoUrl(foto);
  const [carregada, setCarregada] = useState(false);
  return (
    <div className={cx("relative overflow-hidden bg-surface-3", className)}>
      {!carregada && <div className="skeleton absolute inset-0 rounded-none" />}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          onLoad={() => setCarregada(true)}
          className={cx(
            "absolute inset-0 h-full w-full object-cover",
            "transition-[opacity,transform] duration-[var(--dur-std)] ease-[var(--ease-out)]",
            carregada ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
          )}
        />
      )}
    </div>
  );
}
