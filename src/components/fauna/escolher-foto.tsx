"use client";

import { useEffect, useRef, useState } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { IconCamara } from "@/components/icons";
import { novoId } from "@/lib/derivados";
import { dataCurta } from "@/lib/formato";
import { processarImagem, type ImagemProcessada } from "@/lib/imagem";
import type { Foto } from "@/lib/tipos";

export type FotoFaunaEscolhida = { foto: Foto } | { imagem: ImagemProcessada; id: string; criada: Date } | null;

export function EscolherFotoFauna({ fotos, valor, onValor, ocupado, onProcessar }: {
  fotos: Foto[]; valor: FotoFaunaEscolhida; onValor: (v: FotoFaunaEscolhida) => void;
  ocupado: boolean; onProcessar: (v: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [galeria, setGaleria] = useState(false);
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState("");
  const imagem = valor && "imagem" in valor ? valor.imagem : null;

  useEffect(() => {
    if (!imagem) return;
    const url = URL.createObjectURL(imagem.foto);
    const frame = requestAnimationFrame(() => setPreview(url));
    return () => { cancelAnimationFrame(frame); URL.revokeObjectURL(url); };
  }, [imagem]);

  async function carregar(ficheiro: File | undefined) {
    if (!ficheiro) return;
    onProcessar(true);
    setErro("");
    try {
      onValor({ imagem: await processarImagem(ficheiro), id: novoId(), criada: new Date() });
      setGaleria(false);
    } catch {
      setErro("Não foi possível preparar esta fotografia. Experimenta outra.");
    } finally {
      onProcessar(false);
    }
  }

  return (
    <fieldset className="mb-5 rounded-[18px] border border-separator bg-surface p-3" disabled={ocupado}>
      <legend className="px-2 text-footnote font-semibold text-text-2">Fotografia de destaque · opcional</legend>
      <input ref={input} type="file" accept="image/*" aria-label="Carregar fotografia" className="sr-only" tabIndex={-1} onChange={(e) => {
        const ficheiro = e.target.files?.[0];
        e.target.value = "";
        void carregar(ficheiro);
      }} />
      {valor ? (
        <div className="mb-2 overflow-hidden rounded-[12px] bg-surface-3">
          {"foto" in valor ? <FotoImg foto={valor.foto} thumb className="h-28 w-full" alt="Fotografia selecionada" /> : (
            // eslint-disable-next-line @next/next/no-img-element
            preview && <img src={preview} alt="Fotografia selecionada" className="h-28 w-full object-cover" />
          )}
        </div>
      ) : <p className="mb-1 text-footnote text-text-2">Escolhe uma fotografia do iPhone ou da galeria deste aquário.</p>}
      {erro && <p role="alert" className="text-footnote text-danger">{erro}</p>}
      <div className="flex flex-wrap gap-x-3 text-footnote font-semibold text-accent">
        <button type="button" className="pressable flex min-h-11 items-center gap-1.5" onClick={() => input.current?.click()}>
          <IconCamara size={17} />{valor ? "Substituir" : "Carregar foto"}
        </button>
        {fotos.length > 0 && <button type="button" className="pressable min-h-11" aria-expanded={galeria} onClick={() => setGaleria((v) => !v)}>Da galeria</button>}
        {valor && <button type="button" className="pressable min-h-11 text-text-2" onClick={() => { onValor(null); setPreview(""); }}>Remover associação</button>}
      </div>
      {galeria && (
        <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto" role="group" aria-label="Fotografias da galeria">
          {fotos.map((foto, i) => (
            <button key={foto.id} type="button" aria-label={`Escolher fotografia ${i + 1} · ${foto.legenda ?? dataCurta(foto.data)}`}
              aria-pressed={!!valor && "foto" in valor && valor.foto.id === foto.id}
              onClick={() => { onValor({ foto }); setGaleria(false); }}
              className="pressable aspect-square overflow-hidden rounded-[10px] aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-accent">
              <FotoImg foto={foto} thumb className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
