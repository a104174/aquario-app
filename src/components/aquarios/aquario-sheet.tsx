"use client";

import { useState } from "react";
import { AreaNotas, ErroForm, Grupo, InputLinha, InputNumero, Linha } from "@/components/forms/campos";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { novoId } from "@/lib/derivados";
import { lerNumero } from "@/lib/formato";
import { useGuardar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { Aquario } from "@/lib/tipos";

export function AquarioSheet({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inicial?: Aquario;
}) {
  const [k, setK] = useState(0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(o) => !o && setK((x) => x + 1)}
      titulo={inicial ? "Editar aquário" : "Novo aquário"}
      esquerda={<BotaoSheet onClick={() => onOpenChange(false)}>Cancelar</BotaoSheet>}
      rodape={
        <Button type="submit" form="form-aquario" block>
          Guardar
        </Button>
      }
    >
      <FormAquario key={`${k}-${inicial?.id}`} inicial={inicial} onFeito={() => onOpenChange(false)} />
    </Sheet>
  );
}

function FormAquario({ inicial, onFeito }: { inicial?: Aquario; onFeito: () => void }) {
  const guardar = useGuardar("aquarios");
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [bruto, setBruto] = useState(inicial?.volume_bruto_l != null ? String(inicial.volume_bruto_l).replace(".", ",") : "");
  const [util, setUtil] = useState(inicial?.volume_util_l != null ? String(inicial.volume_util_l).replace(".", ",") : "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dá um nome ao aquário.");
    const b = lerNumero(bruto);
    const u = lerNumero(util);
    if ((b !== null && b <= 0) || (u !== null && u <= 0)) return setErro("Os volumes têm de ser maiores que zero.");
    if (b !== null && u !== null && u > b) return setErro("O volume útil não pode ser maior que o bruto.");
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      nome: nome.trim(),
      volume_bruto_l: b,
      volume_util_l: u,
      notas: notas.trim() || null,
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    toast(inicial ? "✓ Aquário atualizado" : "✓ Aquário criado", "ok");
    onFeito();
  }

  return (
    <form id="form-aquario" onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <Grupo>
        <Linha rotulo="Nome" htmlFor="aq-nome">
          <InputLinha id="aq-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Principal" autoFocus={!inicial} />
        </Linha>
      </Grupo>
      <Grupo titulo="Volume" rodape="O volume útil (água real, sem substrato e decoração) é usado para as percentagens das TPAs.">
        <Linha rotulo="Bruto">
          <InputNumero valor={bruto} onValor={setBruto} unidade="L" placeholder="0" />
        </Linha>
        <Linha rotulo="Útil">
          <InputNumero valor={util} onValor={setUtil} unidade="L" placeholder="0" />
        </Linha>
      </Grupo>
      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} />
      </Grupo>
    </form>
  );
}
