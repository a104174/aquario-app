"use client";

import { useState } from "react";
import { IconGota } from "@/components/icons";
import { volumeReferencia, novoId } from "@/lib/derivados";
import { deInputLocal, lerNumero, num, paraInputLocal } from "@/lib/formato";
import { useColecao, useGuardar } from "@/lib/query/dados";
import type { Tpa } from "@/lib/tipos";
import { AreaNotas, Chips, ErroForm, Grupo, InputLinha, Linha, SeletorAquario } from "./campos";
import { lembrarAquario, useAquarioEscolhido, type PropsForm } from "./comum";

const PERCENTAGENS = [10, 20, 25, 30, 50];

export function TpaForm({ formId, inicial, aquarioId, onFeito }: PropsForm<Tpa>) {
  const { data: aquarios = [] } = useColecao("aquarios");
  const { data: produtos = [] } = useColecao("produtos");
  const condicionadores = produtos.filter((p) => p.tipo === "condicionador" && p.ativo && p.dose_por_litro != null);
  const guardar = useGuardar("tpas");

  const [aqId, setAqId] = useAquarioEscolhido(aquarios, inicial?.aquario_id ?? aquarioId);
  const [data, setData] = useState(() => paraInputLocal(inicial ? new Date(inicial.data) : new Date()));
  const [litros, setLitros] = useState(inicial ? String(inicial.litros).replace(".", ",") : "");
  const [condId, setCondId] = useState<string | null>(inicial ? inicial.condicionador_id : null);
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const aquario = aquarios.find((a) => a.id === aqId);
  const volume = volumeReferencia(aquario);
  const condEscolhido = condId === "" ? null : (condicionadores.find((c) => c.id === condId) ?? (inicial ? null : condicionadores[0]));
  const l = lerNumero(litros);
  const dose = l && condEscolhido ? Math.round(l * (condEscolhido.dose_por_litro ?? 0) * 100) / 100 : null;
  const pct = l && volume ? Math.round((l / volume) * 100) : null;

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!aqId) return setErro("Escolhe um aquário.");
    if (!l || l <= 0) return setErro("Indica quantos litros trocaste.");
    lembrarAquario(aqId);
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      aquario_id: aqId,
      data: deInputLocal(data),
      litros: l,
      condicionador_id: condEscolhido?.id ?? null,
      dose_ml: dose,
      notas: notas.trim() || null,
    });
    onFeito(inicial ? "TPA atualizada" : "TPA registada");
  }

  return (
    <form id={formId} onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <SeletorAquario aquarios={aquarios} valor={aqId} onValor={setAqId} />

      <Grupo>
        <Linha rotulo="Litros trocados" htmlFor="tpa-litros">
          <span className="flex items-center gap-1.5">
            <InputLinha
              id="tpa-litros"
              inputMode="decimal"
              placeholder="0"
              value={litros}
              onChange={(e) => setLitros(e.target.value.replace(/[^0-9.,]/g, ""))}
              className="w-24 text-title2 font-semibold tabular-nums"
              autoFocus={!inicial}
            />
            <span className="text-text-3">L</span>
          </span>
        </Linha>
        <Linha rotulo="Data">
          <InputLinha type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
        </Linha>
      </Grupo>

      {volume && (
        <div className="-mt-3 mb-5">
          <Chips
            opcoes={PERCENTAGENS.map((p) => ({ valor: String(p), texto: `${p}% · ${num((volume * p) / 100, 1)} L` }))}
            valor={PERCENTAGENS.find((p) => l && Math.abs(l - (volume * p) / 100) < 0.05)?.toString() ?? null}
            onValor={(p) => setLitros(num((volume * Number(p)) / 100, 1).replace(/\s/g, ""))}
          />
        </div>
      )}

      {/* Dose calculada em tempo real */}
      <div className="mb-5 flex items-center gap-4 rounded-[14px] bg-accent-soft px-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
          <IconGota size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-footnote text-text-2">{condEscolhido ? `Dose de ${condEscolhido.nome}` : "Sem condicionador"}</p>
          <p className="text-title1 font-bold leading-tight tabular-nums">
            {/* a key reinicia o pop a cada mudança: feedback imediato */}
            <span key={dose ?? "x"} className="pop-in inline-block">
              {dose !== null ? `${num(dose, 2)} ml` : "—"}
            </span>
          </p>
          {pct !== null && (
            <p className="text-footnote text-text-2">
              {pct}% dos {num(volume, 1)} L {aquario?.volume_util_l ? "úteis" : "brutos"}
            </p>
          )}
        </div>
      </div>

      {condicionadores.length > 0 && (
        <div className="mb-5">
          <p className="mb-1.5 px-4 text-footnote uppercase tracking-wide text-text-2">Condicionador</p>
          <Chips
            opcoes={[
              ...condicionadores.map((c) => ({ valor: c.id, texto: `${c.nome} · ${num(c.dose_por_litro ?? 0, 3)} ml/L` })),
              { valor: "", texto: "Nenhum" },
            ]}
            valor={condEscolhido?.id ?? ""}
            onValor={setCondId}
          />
        </div>
      )}

      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} />
      </Grupo>
    </form>
  );
}
