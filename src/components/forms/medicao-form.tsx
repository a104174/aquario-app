"use client";

import { useState } from "react";
import { novoId } from "@/lib/derivados";
import { deInputLocal, lerNumero, paraInputLocal } from "@/lib/formato";
import { INFO_PARAMETROS } from "@/lib/parametros";
import { useColecao, useGuardar } from "@/lib/query/dados";
import { PARAMETROS, type Medicao, type MetodoMedicao, type Parametro } from "@/lib/tipos";
import { cx } from "@/lib/cx";
import { AreaNotas, ErroForm, Grupo, InputLinha, Linha, Segmentado, SeletorAquario } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

const METODO_KEY = "aquario-ultimo-metodo";

export function MedicaoForm({ formId, inicial, aquarioId, onFeito }: PropsForm<Medicao>) {
  const { data: aquarios = [] } = useColecao("aquarios");
  const guardar = useGuardar("medicoes");
  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [data, setData] = useState(() => paraInputLocal(inicial ? new Date(inicial.data) : new Date()));
  const [metodo, setMetodo] = useState<MetodoMedicao>(() => {
    if (inicial?.metodo) return inicial.metodo;
    try {
      return (localStorage.getItem(METODO_KEY) as MetodoMedicao) || "gotas";
    } catch {
      return "gotas";
    }
  });
  const [valores, setValores] = useState<Record<Parametro, string>>(
    () =>
      Object.fromEntries(
        PARAMETROS.map((p) => [p, inicial?.[p] != null ? String(inicial[p]).replace(".", ",") : ""]),
      ) as Record<Parametro, string>,
  );
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!aqId) return setErro("Escolhe um aquário.");
    const nums = Object.fromEntries(PARAMETROS.map((p) => [p, lerNumero(valores[p])])) as Record<Parametro, number | null>;
    if (PARAMETROS.every((p) => nums[p] === null)) return setErro("Preenche pelo menos um parâmetro.");
    if (nums.ph !== null && (nums.ph < 0 || nums.ph > 14)) return setErro("O pH tem de estar entre 0 e 14.");
    lembrarAquario(aqId);
    try {
      localStorage.setItem(METODO_KEY, metodo);
    } catch {}
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      aquario_id: aqId,
      data: deInputLocal(data),
      metodo,
      notas: notas.trim() || null,
      ...nums,
    });
    onFeito(inicial ? "Medição atualizada" : "Medição registada");
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <SeletorAquario aquarios={aquarios} valor={aqId} onValor={setAqId} />

      <Segmentado
        className="mb-5"
        opcoes={[
          { valor: "gotas", texto: "Teste de gotas" },
          { valor: "tira", texto: "Tira de teste" },
        ]}
        valor={metodo}
        onValor={setMetodo}
      />

      <Grupo titulo="Parâmetros" rodape="Todos são opcionais. Podes usar vírgula ou ponto.">
        {PARAMETROS.map((p) => {
          const info = INFO_PARAMETROS[p];
          const n = lerNumero(valores[p]);
          const faixa = n !== null ? info.faixa(n) : null;
          return (
            <Linha
              key={p}
              htmlFor={`med-${p}`}
              rotulo={
                <span className="flex items-baseline gap-2">
                  {info.curto}
                  <span className="text-[13px] text-text-3">{info.nome}</span>
                </span>
              }
            >
              <span className="flex items-center gap-1.5">
                <InputLinha
                  id={`med-${p}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  placeholder="—"
                  value={valores[p]}
                  onChange={(e) => setValores((v) => ({ ...v, [p]: e.target.value.replace(/[^0-9.,]/g, "") }))}
                  className={cx("w-20 tabular-nums", faixa === "mau" && "text-danger", faixa === "atencao" && "text-warning")}
                />
                {info.unidade && <span className="w-12 text-[13px] text-text-3">{info.unidade}</span>}
              </span>
            </Linha>
          );
        })}
      </Grupo>

      <Grupo>
        <Linha rotulo="Data">
          <InputLinha type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
        </Linha>
      </Grupo>

      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} />
      </Grupo>
    </form>
  );
}
