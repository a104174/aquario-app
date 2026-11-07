"use client";

import { useEffect, useRef, useState } from "react";
import { FotoImg } from "@/components/eventos/foto-img";
import { PainelCamara, useCamara } from "@/components/forms/camara";
import { AreaNotas, ErroForm, Grupo, InputLinha, InputNumero, Linha } from "@/components/forms/campos";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { useUserId } from "@/lib/auth/session";
import { novoId } from "@/lib/derivados";
import { lerNumero } from "@/lib/formato";
import { lerImagemColada, processarImagem, type ImagemProcessada } from "@/lib/imagem";
import { useGuardar } from "@/lib/query/dados";
import { chaveThumb, guardarFotoPendente } from "@/lib/query/fotos-locais";
import { toast } from "@/lib/toast";
import type { Desejo } from "@/lib/tipos";

export function DesejoSheet({ open, onOpenChange, inicial }: { open: boolean; onOpenChange: (o: boolean) => void; inicial?: Desejo }) {
  const [k, setK] = useState(0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(o) => !o && setK((x) => x + 1)}
      titulo={inicial ? "Editar desejo" : "Novo desejo"}
      esquerda={<BotaoSheet onClick={() => onOpenChange(false)}>Cancelar</BotaoSheet>}
      rodape={
        <Button type="submit" form="form-desejo" block>
          Guardar
        </Button>
      }
    >
      <Form key={`${k}-${inicial?.id}`} inicial={inicial} onFeito={() => onOpenChange(false)} />
    </Sheet>
  );
}

function Form({ inicial, onFeito }: { inicial?: Desejo; onFeito: () => void }) {
  const userId = useUserId();
  const guardar = useGuardar("desejos");
  const [item, setItem] = useState(inicial?.item ?? "");
  const [loja, setLoja] = useState(inicial?.loja ?? "");
  const [link, setLink] = useState(inicial?.link ?? "");
  const [preco, setPreco] = useState(inicial?.preco != null ? String(inicial.preco).replace(".", ",") : "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [img, setImg] = useState<ImagemProcessada | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const camara = useRef<HTMLInputElement>(null);
  const cam = useCamara(camara);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function escolher(b: Blob | null | undefined) {
    if (!b) return;
    try {
      const r = await processarImagem(b);
      setImg(r);
      setPreview(URL.createObjectURL(r.foto));
    } catch {
      setErro("Não foi possível ler esta imagem.");
    }
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) return setErro("O que queres comprar?");
    const l = link.trim();
    if (l && !/^https?:\/\//i.test(l)) return setErro("O link tem de começar por http:// ou https://");
    const id = inicial?.id ?? novoId();
    let foto_path = inicial?.foto_path ?? null;
    let thumb_path = inicial?.thumb_path ?? null;
    if (img && userId) {
      foto_path = `${userId}/desejos/${id}.${img.ext}`;
      thumb_path = `${userId}/desejos/${id}.thumb.${img.ext}`;
      await guardarFotoPendente(id, img.foto);
      await guardarFotoPendente(chaveThumb(id), img.thumb);
    }
    guardar.mutate({
      id,
      item: item.trim(),
      loja: loja.trim() || null,
      link: l || null,
      preco: lerNumero(preco),
      notas: notas.trim() || null,
      foto_path,
      thumb_path,
      estado: inicial?.estado ?? "quero",
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    toast("✓ Guardado na lista", "ok");
    onFeito();
  }

  return (
    <form id="form-desejo" onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />

      <div className="mb-3 overflow-hidden rounded-[14px] bg-surface">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="pop-in aspect-[16/10] w-full object-cover" />
        ) : inicial?.foto_path ? (
          <FotoImg foto={{ id: inicial.id, storage_path: inicial.foto_path, thumb_path: inicial.thumb_path }} className="aspect-[16/10] w-full" />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center text-subhead text-text-3">Print ou foto (opcional)</div>
        )}
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2">
        <button type="button" onClick={async () => escolher(await lerImagemColada().catch(() => null))} className="pressable h-11 rounded-xl bg-surface text-subhead font-medium text-accent">
          Colar print
        </button>
        <button type="button" onClick={() => galeria.current?.click()} className="pressable h-11 rounded-xl bg-surface text-subhead font-medium text-accent">
          Galeria
        </button>
        <button type="button" onClick={cam.abrir} className="pressable h-11 rounded-xl bg-surface text-subhead font-medium text-accent">
          Câmara
        </button>
      </div>

      <PainelCamara
        painel={cam.painel}
        onContinuar={cam.continuar}
        onFechar={cam.fechar}
        onGaleria={() => {
          cam.fechar();
          galeria.current?.click();
        }}
      />

      <Grupo>
        <Linha rotulo="Item" htmlFor="desejo-item">
          <InputLinha id="desejo-item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="ex.: Guppy black rose" />
        </Linha>
        <Linha rotulo="Loja">
          <InputLinha value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="ex.: Aquaralândia" />
        </Linha>
        <Linha rotulo="Link">
          <InputLinha value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" autoCapitalize="none" placeholder="https://" />
        </Linha>
        <Linha rotulo="Preço">
          <InputNumero valor={preco} onValor={setPreco} unidade="€" placeholder="—" />
        </Linha>
      </Grupo>
      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} />
      </Grupo>
    </form>
  );
}
