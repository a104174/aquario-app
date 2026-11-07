"use client";

import { useState } from "react";
import { Chips, ErroForm, Grupo, InputLinha, InputNumero, Interruptor, Linha, Segmentado } from "@/components/forms/campos";
import { confirmar } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { StockVisual } from "@/components/produtos/stock-visual";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { novoId } from "@/lib/derivados";
import { lerNumero, num } from "@/lib/formato";
import { hojeISO, TIPOS_PRODUTO } from "@/lib/produtos";
import { useApagar, useGuardar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { Produto, TipoProduto, Unidade } from "@/lib/tipos";

export function ProdutoSheet({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inicial?: Produto;
}) {
  const [k, setK] = useState(0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(o) => !o && setK((x) => x + 1)}
      titulo={inicial ? inicial.nome : "Novo produto"}
      esquerda={<BotaoSheet onClick={() => onOpenChange(false)}>Cancelar</BotaoSheet>}
      rodape={
        <Button type="submit" form="form-produto" block>
          Guardar
        </Button>
      }
    >
      <Form key={`${k}-${inicial?.id}`} inicial={inicial} onFeito={() => onOpenChange(false)} />
    </Sheet>
  );
}

const str = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

function Form({ inicial, onFeito }: { inicial?: Produto; onFeito: () => void }) {
  const guardar = useGuardar("produtos");
  const apagar = useApagar("produtos");
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [tipo, setTipo] = useState<TipoProduto>(inicial?.tipo ?? "condicionador");
  const [volume, setVolume] = useState(str(inicial?.volume_inicial));
  const [unidade, setUnidade] = useState<Unidade>(inicial?.unidade ?? "ml");
  const [modoDose, setModoDose] = useState<"litro" | "rotulo">("litro");
  const [dose, setDose] = useState(str(inicial?.dose_por_litro));
  const [rotuloMl, setRotuloMl] = useState("5");
  const [rotuloL, setRotuloL] = useState("20");
  const [abertura, setAbertura] = useState(inicial?.data_abertura ?? hojeISO());
  const [duracao, setDuracao] = useState(str(inicial?.duracao_dias));
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);

  const doseCalc =
    modoDose === "litro"
      ? lerNumero(dose)
      : (() => {
          const ml = lerNumero(rotuloMl);
          const l = lerNumero(rotuloL);
          return ml !== null && l ? Math.round((ml / l) * 10000) / 10000 : null;
        })();

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Indica o nome.");
    if (tipo === "condicionador" && (doseCalc === null || doseCalc < 0)) return setErro("Indica a dose do condicionador.");
    const vol = lerNumero(volume);
    if (vol !== null && vol <= 0) return setErro("O volume tem de ser maior que zero.");
    const dur = lerNumero(duracao);
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      nome: nome.trim(),
      tipo,
      dose_por_litro: tipo === "condicionador" ? doseCalc : null,
      volume_inicial: vol,
      unidade,
      data_abertura: abertura || null,
      duracao_dias: tipo !== "condicionador" && dur ? Math.round(dur) : null,
      ativo,
      stock_manual_fracao: inicial?.stock_manual_fracao ?? null,
      stock_atualizado_em: inicial?.stock_atualizado_em ?? null,
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    toast("✓ Produto guardado", "ok");
    onFeito();
  }

  async function remover() {
    if (
      await confirmar({
        titulo: `Apagar “${inicial!.nome}”?`,
        mensagem: "As TPAs já registadas mantêm a dose que foi calculada.",
        acao: "Apagar produto",
        destrutivo: true,
      })
    ) {
      apagar.mutate({ id: inicial!.id });
      onFeito();
    }
  }

  return (
    <form id="form-produto" onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />
      <Grupo>
        <Linha rotulo="Nome" htmlFor="prod-nome">
          <InputLinha id="prod-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: AMTRA Care" />
        </Linha>
      </Grupo>

      <Segmentado className="mb-5" opcoes={TIPOS_PRODUTO} valor={tipo} onValor={setTipo} />

      <Grupo titulo="Embalagem" rodape={tipo === "condicionador" ? "Cada TPA desconta a dose usada a partir da data de abertura." : undefined}>
        <Linha rotulo="Quantidade">
          <InputNumero valor={volume} onValor={setVolume} placeholder="ex.: 250" />
        </Linha>
        <div className="px-4 pb-3">
          <Chips
            opcoes={[
              { valor: "ml" as Unidade, texto: "ml" },
              { valor: "g" as Unidade, texto: "g" },
              { valor: "unid" as Unidade, texto: "unidades" },
            ]}
            valor={unidade}
            onValor={setUnidade}
          />
        </div>
        <Linha rotulo="Aberto a">
          <InputLinha type="date" value={abertura} onChange={(e) => setAbertura(e.target.value)} />
        </Linha>
        {tipo !== "condicionador" && (
          <Linha rotulo="Dura cerca de">
            <InputNumero valor={duracao} onValor={setDuracao} unidade="dias" placeholder="ex.: 90" />
          </Linha>
        )}
      </Grupo>

      {tipo === "condicionador" && (
        <>
          <div className="mb-2 flex gap-2">
            {(["litro", "rotulo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModoDose(m)}
                className={`pressable h-9 rounded-full px-4 text-subhead font-medium ${modoDose === m ? "bg-accent text-accent-contrast" : "bg-surface"}`}
              >
                {m === "litro" ? "ml por litro" : "Como no rótulo"}
              </button>
            ))}
          </div>
          {modoDose === "litro" ? (
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
        </>
      )}

      <Grupo>
        <div className="flex min-h-[48px] items-center justify-between px-4">
          <span className="text-body">Em uso</span>
          <Interruptor ligado={ativo} onMudar={setAtivo} label="Em uso" />
        </div>
      </Grupo>

      {inicial && (
        <div className="space-y-2">
          <StockVisual produto={inicial} onFeito={onFeito} />
          <Button type="button" variant="danger" block onClick={remover}>
            Apagar produto
          </Button>
        </div>
      )}
    </form>
  );
}
