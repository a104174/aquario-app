"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EscolherFotoFauna, type FotoFaunaEscolhida } from "@/components/fauna/escolher-foto";
import { especiesConhecidas, faunaAtual, novoId } from "@/lib/derivados";
import { chaveEspecie, gruposFauna, nomeGrupoFauna } from "@/lib/fauna-grupos";
import { caminhosFoto } from "@/lib/fotos";
import { deInputLocal, paraInputLocal } from "@/lib/formato";
import { guardarFotoFauna, useColecao, useGuardar, useGuardarFaunaConfirmada } from "@/lib/query/dados";
import type { FaunaEvento, Foto, TipoFauna } from "@/lib/tipos";
import { AreaNotas, Chips, ErroForm, Grupo, InputLinha, Linha, SeletorAquario, Stepper } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

export const TIPOS_FAUNA: { valor: TipoFauna; texto: string }[] = [
  { valor: "entrada", texto: "Entrada" },
  { valor: "nascimento", texto: "Nascimento" },
  { valor: "morte", texto: "Morte" },
  { valor: "transferencia", texto: "Transferência" },
  { valor: "saida", texto: "Saída" },
];

type Contexto = { especie: string; grupoId?: string; detalhar?: boolean } | null;

export function FaunaForm({ formId, inicial, aquarioId, onFeito, contexto, editarId, onGuardar }: PropsForm<FaunaEvento> & {
  contexto?: Contexto;
  editarId?: string | null;
  onGuardar?: (aGuardar: boolean) => void;
}) {
  const { data: aquarios = [] } = useColecao("aquarios");
  const { data: fauna = [] } = useColecao("fauna");
  const fotos = useColecao("fotos").data;
  const guardar = useGuardar("fauna");
  const confirmar = useGuardarFaunaConfirmada();
  const qc = useQueryClient();
  const [id] = useState(() => inicial?.id ?? novoId());
  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [tipo, setTipo] = useState<TipoFauna>(inicial?.tipo ?? (contexto?.detalhar ? "detalhe" : contexto ? "saida" : "entrada"));
  const [especie, setEspecie] = useState(inicial?.especie ?? contexto?.especie ?? "");
  const [quantidade, setQuantidade] = useState(inicial?.quantidade ?? 1);
  const [destino, setDestino] = useState<string | null>(inicial?.aquario_destino_id ?? null);
  const [data, setData] = useState(() => paraInputLocal(inicial ? new Date(inicial.data) : new Date()));
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [variedade, setVariedade] = useState(inicial?.variedade ?? "");
  const [nome, setNome] = useState(inicial?.nome_personalizado ?? "");
  const [grupoId, setGrupoId] = useState(inicial?.grupo_id ?? contexto?.grupoId ?? null);
  const [escolha, setEscolha] = useState<FotoFaunaEscolhida | undefined>();
  const [aProcessar, setAProcessar] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const fotosDoAquario = (fotos ?? []).filter((f) => f.aquario_id === aqId);
  const fotoInicial = fotosDoAquario.find((f) => f.id === inicial?.foto_destaque_id);
  const fotoEscolhida = escolha === undefined ? (fotoInicial ? { foto: fotoInicial } : null) : escolha;
  const detalhar = tipo === "detalhe";
  const bloquearOrigem = !!contexto || !!inicial?.grupo_proprio;
  const podeDetalhar = tipo === "entrada" || tipo === "nascimento" || detalhar;

  const sai = tipo === "morte" || tipo === "saida" || tipo === "transferencia";
  // Para saídas, sugerir primeiro as espécies que estão no aquário
  const sugestoes = useMemo(() => {
    const atuais = aqId ? faunaAtual(fauna, aqId).lista.map((x) => x.especie) : [];
    return sai ? atuais : especiesConhecidas(fauna).slice(0, 12);
  }, [fauna, aqId, sai]);
  const outros = aquarios.filter((a) => a.id !== aqId);
  const grupos = aqId ? gruposFauna(fauna, aqId).filter((g) => chaveEspecie(g.especie) === chaveEspecie(especie)) : [];
  const genericos = grupos.find((g) => !g.origem)?.quantidade ?? 0;
  const maxDetalhar = genericos + (inicial?.tipo === "detalhe" ? inicial.quantidade : 0);
  const grupoAtual = grupoId ? fauna.find((f) => f.id === grupoId) : undefined;
  const opcoesGrupos = grupos.flatMap((g) => g.origem ? [{ valor: g.origem.id, texto: `${nomeGrupoFauna(g.origem)} · ×${g.quantidade}` }] : []);
  if (grupoAtual && !opcoesGrupos.some((g) => g.valor === grupoAtual.id)) {
    opcoesGrupos.push({ valor: grupoAtual.id, texto: nomeGrupoFauna(grupoAtual) });
  }

  function escolherEspecie(v: string) {
    setEspecie(v);
    setGrupoId(null);
  }

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (aGuardar || aProcessar) return;
    if (editarId && !inicial) return setErro("Este evento já não está disponível.");
    if (!aqId) return setErro("Escolhe um aquário.");
    if (!especie.trim()) return setErro("Indica a espécie.");
    if (!Number.isInteger(quantidade) || quantidade < 1) return setErro("Indica uma quantidade válida.");
    if (detalhar && quantidade > maxDetalhar) return setErro("A quantidade ultrapassa os animais ainda por identificar.");
    if (podeDetalhar && nome.trim() && quantidade !== 1) return setErro("Usa a quantidade 1 para identificar um animal pelo nome.");
    if (sai && grupoId && (!grupoAtual || chaveEspecie(grupoAtual.especie) !== chaveEspecie(especie))) {
      return setErro("Escolhe um grupo da espécie indicada.");
    }
    let fotoId = podeDetalhar
      ? (fotoEscolhida && "foto" in fotoEscolhida ? fotoEscolhida.foto.id
        : escolha === undefined && aqId === inicial?.aquario_id ? inicial?.foto_destaque_id ?? null : null)
      : null;
    const grupoProprio = podeDetalhar && (detalhar || !!inicial?.grupo_proprio || !!(variedade.trim() || nome.trim() || fotoEscolhida || fotoId));
    if (detalhar && !(variedade.trim() || nome.trim() || notas.trim() || fotoEscolhida || fotoId)) {
      return setErro("Acrescenta uma variedade, nome, fotografia ou nota para distinguir este grupo.");
    }
    const sincronizar = !!inicial || grupoProprio || sai;
    if (sincronizar && !navigator.onLine) return setErro("Liga-te à Internet para validar as quantidades e guardar este registo.");

    lembrarAquario(aqId);
    setErro(null);
    setAGuardar(true);
    onGuardar?.(true);
    try {
      if (podeDetalhar && fotoEscolhida && "imagem" in fotoEscolhida) {
        const imagem = fotoEscolhida.imagem;
        const { id: fotoNovaId, criada: agora } = fotoEscolhida;
        const foto: Foto = {
          id: fotoNovaId, aquario_id: aqId, data: agora.toISOString(),
          ...caminhosFoto(aqId, fotoNovaId, agora, imagem.ext),
          etiqueta: "peixes", legenda: null, evento_tipo: null, evento_id: null,
        };
        await guardarFotoFauna(foto, imagem.foto, imagem.thumb);
        fotoId = foto.id;
        setEscolha({ foto });
        void qc.invalidateQueries({ queryKey: ["fotos"] });
      }
      const linha: FaunaEvento = {
        id, aquario_id: aqId, data: deInputLocal(data), tipo, especie: especie.trim(), quantidade,
        aquario_destino_id: tipo === "transferencia" && destino && destino !== aqId ? destino : null,
        notas: notas.trim() || null,
        ...(sincronizar ? {
          grupo_proprio: grupoProprio,
          grupo_id: sai ? grupoId : null,
          variedade: grupoProprio ? variedade.trim() || null : null,
          nome_personalizado: grupoProprio ? nome.trim() || null : null,
          foto_destaque_id: fotoId,
        } : {}),
      };
      if (sincronizar) await confirmar.mutateAsync(linha);
      else guardar.mutate(linha);
      onFeito(detalhar && !inicial ? "Grupo detalhado · total mantido" : inicial ? "Evento atualizado" : "Evento registado");
    } catch (e) {
      const mensagem = e as { code?: string; message?: string } | null;
      setErro(mensagem?.code === "23514" && mensagem.message?.startsWith("A quantidade")
        ? mensagem.message
        : mensagem?.code === "23503"
          ? "O grupo ou a fotografia já não está disponível. Confirma a seleção e tenta novamente."
          : "Não foi possível guardar o registo. Verifica a ligação e tenta novamente.");
    } finally {
      setAGuardar(false);
      onGuardar?.(false);
    }
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      {(aGuardar || aProcessar) && <p role="status" className="mb-3 text-[14px] text-accent">{aProcessar ? "A preparar a fotografia…" : "A guardar o registo…"}</p>}
      <fieldset className="min-w-0" disabled={aGuardar}>
        {bloquearOrigem ? (
          <p className="mb-3 px-2 text-[14px] text-text-2">{aquarios.find((a) => a.id === aqId)?.nome}</p>
        ) : <SeletorAquario aquarios={aquarios} valor={aqId} onValor={(v) => { setAqId(v); setGrupoId(null); setEscolha(null); }} />}
        {detalhar && (
          <p className="mb-4 rounded-xl bg-accent-soft px-3 py-2.5 text-[14px] text-text">
            Estás a identificar animais já registados. O total mantém-se. Disponíveis para este grupo: {maxDetalhar}.
          </p>
        )}

        {!detalhar && !inicial?.grupo_proprio && <div className="mb-5">
          <p className="mb-1.5 px-4 text-[13px] uppercase tracking-wide text-text-2">Tipo</p>
          <Chips opcoes={contexto ? TIPOS_FAUNA.filter((t) => t.valor !== "entrada" && t.valor !== "nascimento") : TIPOS_FAUNA} valor={tipo} onValor={(v) => { setTipo(v); if (v === "entrada" || v === "nascimento") setGrupoId(null); }} />
        </div>}

        <Grupo>
          <Linha rotulo="Espécie" htmlFor="fauna-especie">
            <InputLinha
              id="fauna-especie"
              value={especie}
              onChange={(e) => escolherEspecie(e.target.value)}
              readOnly={detalhar || !!contexto}
              maxLength={120}
              placeholder="ex.: Neon"
              autoCapitalize="sentences"
              autoComplete="off"
            />
          </Linha>
          <Linha rotulo="Quantidade">
            <Stepper valor={quantidade} onValor={setQuantidade} />
          </Linha>
          <Linha rotulo="Data">
            <InputLinha type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </Linha>
        </Grupo>

        {!detalhar && !contexto && sugestoes.length > 0 && (
          <div className="-mt-3 mb-5">
            <Chips
              opcoes={sugestoes.map((s) => ({ valor: s, texto: s }))}
              valor={sugestoes.find((s) => s.toLocaleLowerCase("pt-PT") === especie.trim().toLocaleLowerCase("pt-PT")) ?? null}
              onValor={escolherEspecie}
            />
          </div>
        )}

        {tipo === "transferencia" && outros.length > 0 && (
          <div className="enter-up mb-5">
            <p className="mb-1.5 px-4 text-[13px] uppercase tracking-wide text-text-2">Para o aquário</p>
            <Chips opcoes={outros.map((a) => ({ valor: a.id, texto: a.nome }))} valor={destino} onValor={setDestino} />
          </div>
        )}

        {sai && opcoesGrupos.length > 0 && (
          <div className="mb-5">
            <p className="mb-1.5 px-4 text-[13px] uppercase tracking-wide text-text-2">Animais a movimentar</p>
            <Chips opcoes={[{ valor: "", texto: `Grupo genérico · ×${genericos}` }, ...opcoesGrupos]}
              valor={grupoId ?? ""} onValor={(v) => setGrupoId(v || null)} />
          </div>
        )}

        {podeDetalhar && <>
          <Grupo titulo="Identificação opcional">
            <Linha rotulo="Variedade" htmlFor="fauna-variedade">
              <InputLinha id="fauna-variedade" value={variedade} maxLength={120} onChange={(e) => setVariedade(e.target.value)} placeholder="ex.: King Cobra" />
            </Linha>
            <Linha rotulo="Nome" htmlFor="fauna-nome">
              <InputLinha id="fauna-nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Blue" />
            </Linha>
          </Grupo>
          {aqId && <EscolherFotoFauna fotos={fotosDoAquario} valor={fotoEscolhida} onValor={setEscolha} ocupado={aGuardar || aProcessar} onProcessar={(v) => { setAProcessar(v); onGuardar?.(v); }} />}
        </>}

        <Grupo>
          <AreaNotas valor={notas} onValor={setNotas} />
        </Grupo>
      </fieldset>
    </form>
  );
}
