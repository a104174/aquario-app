"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCamara } from "@/components/icons";
import { FotoImg } from "@/components/eventos/foto-img";
import { novoId } from "@/lib/derivados";
import { caminhosFoto, ETIQUETAS } from "@/lib/fotos";
import { dataCurta, deInputLocal, num, paraInputLocal } from "@/lib/formato";
import { lerImagemColada, processarImagem, type ImagemProcessada } from "@/lib/imagem";
import { useColecao, useGuardar } from "@/lib/query/dados";
import { chaveThumb, guardarFotoPendente } from "@/lib/query/fotos-locais";
import type { EtiquetaFoto, Foto, TipoEventoFoto } from "@/lib/tipos";
import { PainelCamara, useCamara } from "./camara";
import { Chips, ErroForm, Grupo, InputLinha, Linha, SeletorAquario } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

const SEM_EVENTO = "nenhum";

export function FotoForm({
  formId,
  inicial,
  aquarioId,
  onFeito,
  evento,
}: PropsForm<Foto> & { evento?: { tipo: TipoEventoFoto; id: string } | null }) {
  const { data: aquarios = [] } = useColecao("aquarios");
  const { data: tpas } = useColecao("tpas");
  const { data: medicoes } = useColecao("medicoes");
  const { data: fauna } = useColecao("fauna");
  const guardar = useGuardar("fotos");
  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [img, setImg] = useState<ImagemProcessada | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aProcessar, setAProcessar] = useState(false);
  const [etiqueta, setEtiqueta] = useState<EtiquetaFoto>(inicial?.etiqueta ?? "outro");
  const [legenda, setLegenda] = useState(inicial?.legenda ?? "");
  const [data, setData] = useState(() => paraInputLocal(inicial ? new Date(inicial.data) : new Date()));
  const [ligacao, setLigacao] = useState<string>(() => {
    const e = inicial?.evento_id ? { tipo: inicial.evento_tipo!, id: inicial.evento_id } : evento;
    return e ? `${e.tipo}:${e.id}` : SEM_EVENTO;
  });
  const [erro, setErro] = useState<string | null>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const camara = useCamara(camaraRef);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // Colar um print (⌘V / colar do menu do iOS)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) {
        e.preventDefault();
        void escolher(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  // Registos recentes do aquário (14 dias) a que a foto se pode ligar
  const eventos = useMemo(() => {
    if (!aqId) return [];
    const limite = Date.now() - 14 * 864e5;
    const recente = (d: string) => new Date(d).getTime() >= limite;
    return [
      ...(tpas ?? []).filter((t) => t.aquario_id === aqId && recente(t.data)).map((t) => ({ chave: `tpa:${t.id}`, data: t.data, texto: `TPA ${num(t.litros, 1)} L · ${dataCurta(t.data)}` })),
      ...(medicoes ?? []).filter((m) => m.aquario_id === aqId && recente(m.data)).map((m) => ({ chave: `medicao:${m.id}`, data: m.data, texto: `Medição · ${dataCurta(m.data)}` })),
      ...(fauna ?? []).filter((f) => f.aquario_id === aqId && recente(f.data)).map((f) => ({ chave: `fauna:${f.id}`, data: f.data, texto: `${f.especie} · ${dataCurta(f.data)}` })),
    ]
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 8);
  }, [aqId, tpas, medicoes, fauna]);

  async function escolher(f: Blob | undefined | null) {
    if (!f) return;
    setErro(null);
    setAProcessar(true);
    try {
      const r = await processarImagem(f);
      setImg(r);
      setPreview(URL.createObjectURL(r.foto));
    } catch {
      setErro("Não foi possível ler esta imagem.");
    } finally {
      setAProcessar(false);
    }
  }

  async function colar() {
    try {
      const b = await lerImagemColada();
      if (b) await escolher(b);
      else setErro("Não há nenhuma imagem copiada.");
    } catch {
      setErro("Sem acesso à área de transferência. Toca e mantém num campo e escolhe Colar.");
    }
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!aqId) return setErro("Escolhe um aquário.");
    if (!inicial && !img) return setErro("Tira, escolhe ou cola uma foto.");
    lembrarAquario(aqId);
    const id = inicial?.id ?? novoId();
    const quando = deInputLocal(data);
    let caminhos = { storage_path: inicial?.storage_path ?? "", thumb_path: inicial?.thumb_path ?? null };
    if (img) {
      caminhos = caminhosFoto(aqId, id, new Date(quando), img.ext);
      await guardarFotoPendente(id, img.foto);
      await guardarFotoPendente(chaveThumb(id), img.thumb);
    }
    const [evTipo, evId] = ligacao === SEM_EVENTO ? [null, null] : ligacao.split(":");
    guardar.mutate({
      id,
      aquario_id: aqId,
      data: quando,
      ...caminhos,
      etiqueta,
      legenda: legenda.trim() || null,
      evento_tipo: (evTipo as TipoEventoFoto | null) ?? null,
      evento_id: evId ?? null,
    });
    onFeito(inicial ? "Foto atualizada" : "Foto guardada");
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <SeletorAquario aquarios={aquarios} valor={aqId} onValor={setAqId} />

      <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
      <input ref={galeriaRef} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />

      <div className="mb-3 overflow-hidden rounded-[14px] bg-surface">
        {aProcessar ? (
          <div className="skeleton aspect-[4/3] w-full rounded-none" />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pré-visualização" className="pop-in aspect-[4/3] w-full object-cover" />
        ) : inicial ? (
          <FotoImg foto={inicial} className="aspect-[4/3] w-full" />
        ) : (
          <button
            type="button"
            onClick={camara.abrir}
            className="pressable flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-accent"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
              <IconCamara size={32} />
            </span>
            <span className="text-body font-semibold">Tirar foto</span>
          </button>
        )}
      </div>

      <PainelCamara
        painel={camara.painel}
        onContinuar={camara.continuar}
        onFechar={camara.fechar}
        onGaleria={() => {
          camara.fechar();
          galeriaRef.current?.click();
        }}
      />

      {!inicial && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          {[
            { t: "Câmara", f: camara.abrir },
            { t: "Galeria", f: () => galeriaRef.current?.click() },
            { t: "Colar print", f: colar },
          ].map((b) => (
            <button key={b.t} type="button" onClick={b.f} className="pressable h-11 rounded-xl bg-surface text-subhead font-medium text-accent">
              {b.t}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5">
        <p className="mb-1.5 px-4 text-footnote uppercase tracking-wide text-text-2">Etiqueta</p>
        <Chips opcoes={ETIQUETAS} valor={etiqueta} onValor={setEtiqueta} />
      </div>

      {eventos.length > 0 && (
        <div className="mb-5">
          <p className="mb-1.5 px-4 text-footnote uppercase tracking-wide text-text-2">Ligar a um registo</p>
          <Chips opcoes={[{ chave: SEM_EVENTO, texto: "Nenhum" }, ...eventos].map((e) => ({ valor: e.chave, texto: e.texto }))} valor={ligacao} onValor={setLigacao} />
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
