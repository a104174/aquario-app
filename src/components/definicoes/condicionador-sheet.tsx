"use client";

import { useState } from "react";
import { ErroForm, Grupo, InputLinha, InputNumero, Linha } from "@/components/forms/campos";
import { confirmar } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { novoId } from "@/lib/derivados";
import { lerNumero, num } from "@/lib/formato";
import { useApagar, useGuardar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { Condicionador } from "@/lib/tipos";

export function CondicionadorSheet({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inicial?: Condicionador;
}) {
  const [k, setK] = useState(0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(o) => !o && setK((x) => x + 1)}
      titulo={inicial ? "Condicionador" : "Novo condicionador"}
      esquerda={<BotaoSheet onClick={() => onOpenChange(false)}>Cancelar</BotaoSheet>}
      rodape={
        <Button type="submit" form="form-cond" block>
          Guardar
        </Button>
      }
    >
      <Form key={`${k}-${inicial?.id}`} inicial={inicial} onFeito={() => onOpenChange(false)} />
    </Sheet>
  );
}

function Form({ inicial, onFeito }: { inicial?: Condicionador; onFeito: () => void }) {
  const guardar = useGuardar("condicionadores");
  const apagar = useApagar("condicionadores");
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [dose, setDose] = useState(inicial ? String(inicial.dose_ml_por_litro).replace(".", ",") : "");
  const [modo, setModo] = useState<"litro" | "rotulo">("litro");
  const [rotuloMl, setRotuloMl] = useState("5");
  const [rotuloL, setRotuloL] = useState("20");
  const [erro, setErro] = useState<string | null>(null);

  const doseCalc = modo === "litro" ? lerNumero(dose) : (() => {
    const ml = lerNumero(rotuloMl);
    const l = lerNumero(rotuloL);
    return ml !== null && l ? Math.round((ml / l) * 10000) / 10000 : null;
  })();

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Indica o nome.");
    if (doseCalc === null || doseCalc < 0) return setErro("Indica uma dose válida.");
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      nome: nome.trim(),
      dose_ml_por_litro: doseCalc,
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    toast("✓ Condicionador guardado", "ok");
    onFeito();
  }

  async function remover() {
    const ok = await confirmar({
      titulo: `Apagar “${inicial!.nome}”?`,
      mensagem: "As TPAs já registadas mantêm a dose que foi calculada.",
      acao: "Apagar condicionador",
      destrutivo: true,
    });
    if (ok) {
      apagar.mutate({ id: inicial!.id });
      onFeito();
    }
  }

  return (
    <form id="form-cond" onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <Grupo>
        <Linha rotulo="Nome" htmlFor="cond-nome">
          <InputLinha id="cond-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: AMTRA Care" />
        </Linha>
      </Grupo>

      <div className="mb-2 flex gap-2">
        {(["litro", "rotulo"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`pressable h-9 rounded-full px-4 text-[15px] font-medium ${modo === m ? "bg-accent text-accent-contrast" : "bg-surface"}`}
          >
            {m === "litro" ? "ml por litro" : "Como no rótulo"}
          </button>
        ))}
      </div>

      {modo === "litro" ? (
        <Grupo>
          <Linha rotulo="Dose">
            <InputNumero valor={dose} onValor={setDose} unidade="ml/L" placeholder="0,25" />
          </Linha>
        </Grupo>
      ) : (
        <Grupo rodape={doseCalc !== null ? `= ${num(doseCalc, 4)} ml por litro` : undefined}>
          <Linha rotulo="Dose">
            <InputNumero valor={rotuloMl} onValor={setRotuloMl} unidade="ml" />
          </Linha>
          <Linha rotulo="Para">
            <InputNumero valor={rotuloL} onValor={setRotuloL} unidade="L" />
          </Linha>
        </Grupo>
      )}

      {inicial && (
        <Button type="button" variant="danger" block onClick={remover}>
          Apagar condicionador
        </Button>
      )}
    </form>
  );
}
