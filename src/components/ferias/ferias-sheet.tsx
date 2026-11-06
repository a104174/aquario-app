"use client";

import { useState } from "react";
import { AreaNotas, ErroForm, Grupo, InputLinha, Linha } from "@/components/forms/campos";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { novoId } from "@/lib/derivados";
import { hojeISO } from "@/lib/produtos";
import { useGuardar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { Ferias } from "@/lib/tipos";

export const CHECKLIST_PADRAO = [
  "Fazer uma TPA 1–2 dias antes",
  "Comida preparada (doseador ou porções)",
  "Combinar quem alimenta e explicar as doses",
  "Verificar aquecedor e filtro",
  "Luz com temporizador",
  "Tampa bem fechada",
];

export function FeriasSheet({ open, onOpenChange, inicial }: { open: boolean; onOpenChange: (o: boolean) => void; inicial?: Ferias }) {
  const [k, setK] = useState(0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(o) => !o && setK((x) => x + 1)}
      titulo={inicial ? "Editar férias" : "Planear férias"}
      esquerda={<BotaoSheet onClick={() => onOpenChange(false)}>Cancelar</BotaoSheet>}
      rodape={
        <Button type="submit" form="form-ferias" block>
          Guardar
        </Button>
      }
    >
      <Form key={`${k}-${inicial?.id}`} inicial={inicial} onFeito={() => onOpenChange(false)} />
    </Sheet>
  );
}

function Form({ inicial, onFeito }: { inicial?: Ferias; onFeito: () => void }) {
  const guardar = useGuardar("ferias");
  const [ida, setIda] = useState(inicial?.ida ?? hojeISO());
  const [regresso, setRegresso] = useState(inicial?.regresso ?? hojeISO());
  const [quem, setQuem] = useState(inicial?.quem_alimenta ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [erro, setErro] = useState<string | null>(null);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (regresso < ida) return setErro("O regresso tem de ser depois da ida.");
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      ida,
      regresso,
      quem_alimenta: quem.trim() || null,
      notas: notas.trim() || null,
      checklist: inicial?.checklist ?? CHECKLIST_PADRAO.map((texto) => ({ texto, feito: false })),
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    toast("✓ Férias guardadas", "ok");
    onFeito();
  }

  return (
    <form id="form-ferias" onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <Grupo rodape="Durante as férias os avisos de TPA ficam em pausa. Dois dias antes recebes um aviso se a checklist estiver incompleta, e no regresso um lembrete para verificares tudo.">
        <Linha rotulo="Ida">
          <InputLinha type="date" value={ida} onChange={(e) => setIda(e.target.value)} />
        </Linha>
        <Linha rotulo="Regresso">
          <InputLinha type="date" value={regresso} onChange={(e) => setRegresso(e.target.value)} />
        </Linha>
        <Linha rotulo="Quem alimenta">
          <InputLinha value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="ex.: Mãe" />
        </Linha>
      </Grupo>
      <Grupo>
        <AreaNotas valor={notas} onValor={setNotas} placeholder="Instruções (doses, horários…)" />
      </Grupo>
    </form>
  );
}
