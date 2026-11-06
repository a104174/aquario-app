"use client";

import { useMemo, useState } from "react";
import { especiesConhecidas, faunaAtual, novoId } from "@/lib/derivados";
import { deInputLocal, paraInputLocal } from "@/lib/formato";
import { useColecao, useGuardar } from "@/lib/query/dados";
import type { FaunaEvento, TipoFauna } from "@/lib/tipos";
import { AreaNotas, Chips, ErroForm, Grupo, InputLinha, Linha, SeletorAquario, Stepper } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

export const TIPOS_FAUNA: { valor: TipoFauna; texto: string }[] = [
  { valor: "entrada", texto: "Entrada" },
  { valor: "nascimento", texto: "Nascimento" },
  { valor: "morte", texto: "Morte" },
  { valor: "transferencia", texto: "Transferência" },
  { valor: "saida", texto: "Saída" },
];

export function FaunaForm({ formId, inicial, aquarioId, onFeito }: PropsForm<FaunaEvento>) {
  const { data: aquarios = [] } = useColecao("aquarios");
  const { data: fauna = [] } = useColecao("fauna");
  const guardar = useGuardar("fauna");
  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [tipo, setTipo] = useState<TipoFauna>(inicial?.tipo ?? "entrada");
  const [especie, setEspecie] = useState(inicial?.especie ?? "");
  const [quantidade, setQuantidade] = useState(inicial?.quantidade ?? 1);
  const [destino, setDestino] = useState<string | null>(inicial?.aquario_destino_id ?? null);
  const [data, setData] = useState(() => paraInputLocal(inicial ? new Date(inicial.data) : new Date()));
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const sai = tipo === "morte" || tipo === "saida" || tipo === "transferencia";
  // Para saídas, sugerir primeiro as espécies que estão no aquário
  const sugestoes = useMemo(() => {
    const atuais = aqId ? faunaAtual(fauna, aqId).lista.map((x) => x.especie) : [];
    return sai ? atuais : especiesConhecidas(fauna).slice(0, 12);
  }, [fauna, aqId, sai]);
  const outros = aquarios.filter((a) => a.id !== aqId);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!aqId) return setErro("Escolhe um aquário.");
    if (!especie.trim()) return setErro("Indica a espécie.");
    lembrarAquario(aqId);
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      aquario_id: aqId,
      data: deInputLocal(data),
      tipo,
      especie: especie.trim(),
      quantidade,
      aquario_destino_id: tipo === "transferencia" && destino && destino !== aqId ? destino : null,
      notas: notas.trim() || null,
    });
    onFeito(inicial ? "Evento atualizado" : "Evento registado");
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <SeletorAquario aquarios={aquarios} valor={aqId} onValor={setAqId} />

      <div className="mb-5">
        <p className="mb-1.5 px-4 text-[13px] uppercase tracking-wide text-text-2">Tipo</p>
        <Chips opcoes={TIPOS_FAUNA} valor={tipo} onValor={setTipo} />
      </div>

      <Grupo>
        <Linha rotulo="Espécie" htmlFor="fauna-especie">
          <InputLinha
            id="fauna-especie"
            enterKeyHint="done"
            value={especie}
            onChange={(e) => setEspecie(e.target.value)}
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

      {sugestoes.length > 0 && (
        <div className="-mt-3 mb-5">
          <Chips
            opcoes={sugestoes.map((s) => ({ valor: s, texto: s }))}
            valor={sugestoes.find((s) => s.toLocaleLowerCase("pt-PT") === especie.trim().toLocaleLowerCase("pt-PT")) ?? null}
            onValor={setEspecie}
          />
        </div>
      )}

      {tipo === "transferencia" && outros.length > 0 && (
        <div className="enter-up mb-5">
          <p className="mb-1.5 px-4 text-[13px] uppercase tracking-wide text-text-2">Para o aquário</p>
          <Chips opcoes={outros.map((a) => ({ valor: a.id, texto: a.nome }))} valor={destino} onValor={setDestino} />
        </div>
      )}

      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} />
      </Grupo>
    </form>
  );
}
