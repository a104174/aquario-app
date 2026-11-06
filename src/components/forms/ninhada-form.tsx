"use client";

import { useMemo, useState } from "react";
import { novoId } from "@/lib/derivados";
import { NOME_ESTADO } from "@/lib/ninhadas";
import { hojeISO } from "@/lib/produtos";
import { useColecao, useGuardar } from "@/lib/query/dados";
import type { EstadoNinhada, Ninhada } from "@/lib/tipos";
import { AreaNotas, Chips, ErroForm, Grupo, InputLinha, Linha, Segmentado, SeletorAquario } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

export function NinhadaForm({ formId, inicial, aquarioId, onFeito }: PropsForm<Ninhada>) {
  const { data: aquarios = [] } = useColecao("aquarios");
  const { data: ninhadas = [] } = useColecao("ninhadas");
  const guardar = useGuardar("ninhadas");
  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [mae, setMae] = useState(inicial?.mae ?? "");
  const [data, setData] = useState(inicial?.data_parto ?? hojeISO());
  const [estado, setEstado] = useState<EstadoNinhada>(inicial?.estado ?? "ativa");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);

  // Mães já registadas neste aquário (para repetir com 1 toque)
  const maes = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of ninhadas) if (n.aquario_id === aqId) m.set(n.mae.toLocaleLowerCase("pt-PT"), n.mae);
    return [...m.values()];
  }, [ninhadas, aqId]);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!aqId) return setErro("Escolhe um aquário.");
    if (!mae.trim()) return setErro("Identifica a mãe (ex.: fêmea cauda amarela/preta).");
    lembrarAquario(aqId);
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      aquario_id: aqId,
      mae: mae.trim(),
      data_parto: data,
      estado,
      notas: notas.trim() || null,
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    onFeito(inicial ? "Ninhada atualizada" : "Ninhada registada");
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <SeletorAquario aquarios={aquarios} valor={aqId} onValor={setAqId} />
      <Grupo rodape="Sem contar alevins: só a mãe e a data. Avisos aos 25 dias (novo parto) e às 4 e 6 semanas (separar machos).">
        <Linha rotulo="Mãe" htmlFor="ninhada-mae">
          <InputLinha id="ninhada-mae" enterKeyHint="done" value={mae} onChange={(e) => setMae(e.target.value)} placeholder="ex.: fêmea cauda amarela" />
        </Linha>
        <Linha rotulo="Parto">
          <InputLinha type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Linha>
      </Grupo>
      {maes.length > 0 && (
        <div className="-mt-3 mb-5">
          <Chips opcoes={maes.map((m) => ({ valor: m, texto: m }))} valor={maes.find((m) => m === mae.trim()) ?? null} onValor={setMae} />
        </div>
      )}
      {inicial && (
        <Segmentado
          className="mb-5"
          opcoes={(Object.keys(NOME_ESTADO) as EstadoNinhada[]).map((v) => ({ valor: v, texto: v === "separada" ? "Separada" : NOME_ESTADO[v] }))}
          valor={estado}
          onValor={setEstado}
        />
      )}
      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} />
      </Grupo>
    </form>
  );
}
