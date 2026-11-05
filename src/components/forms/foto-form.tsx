"use client";

import { useEffect, useRef, useState } from "react";
import { IconCamara } from "@/components/icons";
import { FotoImg } from "@/components/eventos/foto-img";
import { useUserId } from "@/lib/auth/session";
import { novoId } from "@/lib/derivados";
import { deInputLocal, paraInputLocal } from "@/lib/formato";
import { comprimirImagem } from "@/lib/imagem";
import { useColecao, useGuardar } from "@/lib/query/dados";
import { guardarFotoPendente } from "@/lib/query/fotos-locais";
import type { Foto } from "@/lib/tipos";
import { ErroForm, Grupo, InputLinha, Linha, SeletorAquario } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

export function FotoForm({ formId, inicial, aquarioId, onFeito }: PropsForm<Foto>) {
  const userId = useUserId();
  const { data: aquarios = [] } = useColecao("aquarios");
  const guardar = useGuardar("fotos");
  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aProcessar, setAProcessar] = useState(false);
  const [legenda, setLegenda] = useState(inicial?.legenda ?? "");
  const [data, setData] = useState(() => paraInputLocal(inicial ? new Date(inicial.data) : new Date()));
  const [erro, setErro] = useState<string | null>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setAProcessar(true);
    const b = await comprimirImagem(f);
    setBlob(b);
    setPreview(URL.createObjectURL(b));
    setAProcessar(false);
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!aqId) return setErro("Escolhe um aquário.");
    if (!inicial && !blob) return setErro("Tira ou escolhe uma foto.");
    if (!userId) return setErro("Sessão expirada. Volta a entrar.");
    lembrarAquario(aqId);
    const id = inicial?.id ?? novoId();
    if (blob) await guardarFotoPendente(id, blob);
    guardar.mutate({
      id,
      aquario_id: aqId,
      data: deInputLocal(data),
      storage_path: inicial?.storage_path ?? `${userId}/${aqId}/${id}.jpg`,
      legenda: legenda.trim() || null,
    });
    onFeito(inicial ? "Foto atualizada" : "Foto guardada");
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <SeletorAquario aquarios={aquarios} valor={aqId} onValor={setAqId} />

      {/* inputs escondidos: câmara (capture) e galeria */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />

      <div className="mb-5 overflow-hidden rounded-[14px] bg-surface">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pré-visualização" className="pop-in aspect-[4/3] w-full object-cover" />
        ) : inicial ? (
          <FotoImg foto={inicial} className="aspect-[4/3] w-full" />
        ) : (
          <button
            type="button"
            onClick={() => camaraRef.current?.click()}
            className="pressable flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-accent"
          >
            {aProcessar ? (
              <span className="skeleton block h-full w-full rounded-none" />
            ) : (
              <>
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
                  <IconCamara size={32} />
                </span>
                <span className="text-[17px] font-semibold">Tirar foto</span>
              </>
            )}
          </button>
        )}
      </div>

      {!inicial && (
        <div className="-mt-2 mb-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => camaraRef.current?.click()}
            className="pressable h-11 rounded-xl bg-surface text-[15px] font-medium text-accent"
          >
            Câmara
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            className="pressable h-11 rounded-xl bg-surface text-[15px] font-medium text-accent"
          >
            Galeria
          </button>
        </div>
      )}

      <Grupo>
        <Linha rotulo="Legenda" htmlFor="foto-legenda">
          <InputLinha id="foto-legenda" value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Opcional" />
        </Linha>
        <Linha rotulo="Data">
          <InputLinha type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
        </Linha>
      </Grupo>
    </form>
  );
}
