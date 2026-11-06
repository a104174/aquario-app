"use client";

import { useState, type ReactNode } from "react";
import { IconGota, IconPeixe, IconTubo } from "@/components/icons";
import { escolher } from "@/components/ui/action-sheet";
import { cx } from "@/lib/cx";
import { hora, num } from "@/lib/formato";
import { INFO_PARAMETROS } from "@/lib/parametros";
import { useApagar } from "@/lib/query/dados";
import { abrirVisualizador } from "@/lib/visualizador-store";
import type { Colecao } from "@/lib/query/keys";
import { abrirRegistar, type TipoRegisto } from "@/lib/ui-store";
import { PARAMETROS, type Aquario, type Condicionador, type Evento } from "@/lib/tipos";
import { FotoImg } from "./foto-img";
import { useToqueLongo } from "@/lib/gestos";
import { vibrar } from "@/lib/haptic";
import { NOME_ETIQUETA } from "@/lib/fotos";

const COLECAO: Record<Evento["tipo"], Colecao> = { tpa: "tpas", medicao: "medicoes", fauna: "fauna", foto: "fotos" };
const NOME: Record<Evento["tipo"], string> = { tpa: "TPA", medicao: "medição", fauna: "evento de fauna", foto: "foto" };

const TEXTO_FAUNA = {
  entrada: "Entrada",
  nascimento: "Nascimento",
  morte: "Morte",
  transferencia: "Transferência",
  saida: "Saída",
} as const;

export function LinhaEvento({
  evento,
  aquarios,
  condicionadores,
  mostrarAquario,
  aquarioContexto,
  fotosTodas,
}: {
  evento: Evento;
  aquarios?: Aquario[];
  condicionadores?: Condicionador[];
  mostrarAquario?: boolean;
  /** Aquário do ecrã atual (para transferências recebidas) */
  aquarioContexto?: string;
  fotosTodas?: { id: string; aquario_id: string }[];
}) {
  const apagar = useApagar(COLECAO[evento.tipo]);
  const toqueLongo = useToqueLongo(() => void opcoes());
  const [saindo, setSaindo] = useState(false);
  const nomeAquario = aquarios?.find((a) => a.id === evento.aquario_id)?.nome;

  /** Toque simples: abre logo (editar; nas fotos, o visualizador). */
  function abrir() {
    if (toqueLongo.foiLongo()) return;
    if (evento.tipo === "foto") {
      const doAquario = (fotosTodas ?? []).filter((f) => f.aquario_id === evento.aquario_id).map((f) => f.id);
      return abrirVisualizador(doAquario, Math.max(0, doAquario.indexOf(evento.id)));
    }
    abrirRegistar({ tipo: evento.tipo as TipoRegisto, editarId: evento.id, aquarioId: evento.aquario_id });
  }

  /** Toque longo: menu de ações (como o menu de contexto do iOS). */
  async function opcoes() {
    const foto = evento.tipo === "foto";
    const i = await escolher({
      titulo: `${NOME[evento.tipo].charAt(0).toUpperCase()}${NOME[evento.tipo].slice(1)} · ${hora(evento.data)}`,
      opcoes: [{ texto: "Editar" }, { texto: foto ? "Ver foto" : "Adicionar foto" }, { texto: `Apagar ${NOME[evento.tipo]}`, destrutivo: true }],
    });
    if (i === 0) abrirRegistar({ tipo: evento.tipo as TipoRegisto, editarId: evento.id, aquarioId: evento.aquario_id });
    if (i === 1 && foto) {
      const doAquario = (fotosTodas ?? []).filter((f) => f.aquario_id === evento.aquario_id).map((f) => f.id);
      abrirVisualizador(doAquario, Math.max(0, doAquario.indexOf(evento.id)));
    }
    if (i === 1 && !foto) abrirRegistar({ tipo: "foto", aquarioId: evento.aquario_id, evento: { tipo: evento.tipo as "tpa" | "medicao" | "fauna", id: evento.id } });
    if (i === 2) {
      vibrar("medio");
      setSaindo(true);
      // deixa a animação de saída correr antes de remover da cache
      setTimeout(() => apagar.mutate({ id: evento.id }), 260);
    }
  }

  let icone: ReactNode;
  let titulo: ReactNode;
  let detalhe: ReactNode = null;

  if (evento.tipo === "tpa") {
    const t = evento.item;
    const cond = condicionadores?.find((c) => c.id === t.condicionador_id);
    const aq = aquarios?.find((a) => a.id === t.aquario_id);
    const vol = aq?.volume_util_l ?? aq?.volume_bruto_l;
    icone = <Bolha className="bg-accent-soft text-accent"><IconGota size={20} /></Bolha>;
    titulo = (
      <>
        TPA de {num(t.litros, 1)} L{vol ? <span className="font-normal text-text-2"> · {Math.round((t.litros / vol) * 100)}%</span> : null}
      </>
    );
    detalhe = t.dose_ml != null ? `${num(t.dose_ml, 2)} ml de ${cond?.nome ?? "condicionador"}` : "Sem condicionador";
  } else if (evento.tipo === "medicao") {
    const m = evento.item;
    icone = <Bolha className="bg-accent-soft text-accent"><IconTubo size={20} /></Bolha>;
    titulo = <>Medição{m.metodo && <span className="font-normal text-text-2"> · {m.metodo === "gotas" ? "gotas" : "tira"}</span>}</>;
    detalhe = (
      <span className="mt-1 flex flex-wrap gap-1">
        {PARAMETROS.filter((p) => m[p] != null).map((p) => {
          const info = INFO_PARAMETROS[p];
          const v = Number(m[p]);
          const f = info.faixa(v);
          return (
            <span
              key={p}
              className={cx(
                "rounded-md px-1.5 py-0.5 text-[13px] tabular-nums",
                f === "ok" && "bg-surface-2 text-text",
                f === "atencao" && "bg-warning-soft text-text",
                f === "mau" && "bg-danger-soft text-text",
              )}
            >
              {f !== "ok" && <span aria-label={f === "mau" ? "fora do intervalo" : "atenção"}>{f === "mau" ? "‼ " : "! "}</span>}
              {info.curto} {num(v, info.decimais)}
              {info.unidade && info.unidade !== "mg/L" ? ` ${info.unidade}` : ""}
            </span>
          );
        })}
      </span>
    );
  } else if (evento.tipo === "fauna") {
    const f = evento.item;
    const recebida = aquarioContexto && f.aquario_destino_id === aquarioContexto;
    const positivo = f.tipo === "entrada" || f.tipo === "nascimento" || recebida;
    icone = (
      <Bolha className={positivo ? "bg-ok-soft text-ok" : "bg-surface-3 text-text-2"}>
        <IconPeixe size={20} />
      </Bolha>
    );
    titulo = (
      <>
        <span className="tabular-nums">{positivo ? "+" : "−"}{f.quantidade}</span> {f.especie}
      </>
    );
    const destino = aquarios?.find((a) => a.id === f.aquario_destino_id)?.nome;
    const origem = aquarios?.find((a) => a.id === f.aquario_id)?.nome;
    detalhe = recebida
      ? `Transferência de ${origem ?? "outro aquário"}`
      : f.tipo === "transferencia" && destino
        ? `Transferência para ${destino}`
        : TEXTO_FAUNA[f.tipo];
  } else {
    const p = evento.item;
    icone = <FotoImg foto={p} thumb className="h-10 w-10 shrink-0 rounded-[10px]" />;
    titulo = `Foto · ${NOME_ETIQUETA[p.etiqueta] ?? "Outro"}`;
    detalhe = p.legenda;
  }

  const notas = "notas" in evento.item ? evento.item.notas : null;

  return (
    <div className="colapsar" data-saindo={saindo || undefined}>
      <div>
        <button
          type="button"
          onClick={abrir}
          onTouchStart={toqueLongo.onTouchStart}
          onTouchMove={toqueLongo.onTouchMove}
          onTouchEnd={toqueLongo.onTouchEnd}
          onTouchCancel={toqueLongo.onTouchCancel}
          onContextMenu={(e) => {
            e.preventDefault();
            void opcoes();
          }}
          className="pressable-row relative flex w-full items-start gap-3 px-4 py-3 text-left after:absolute after:bottom-0 after:left-[64px] after:right-0 after:h-px after:bg-separator"
        >
          {icone}
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[16px] font-semibold">{titulo}</span>
              <span className="shrink-0 text-[13px] tabular-nums text-text-3">{hora(evento.data)}</span>
            </span>
            {mostrarAquario && nomeAquario && <span className="block truncate text-[13px] text-accent">{nomeAquario}</span>}
            {detalhe && <span className="block text-[14px] text-text-2">{detalhe}</span>}
            {notas && <span className="selectable mt-0.5 block text-[14px] italic text-text-2">{notas}</span>}
          </span>
        </button>
      </div>
    </div>
  );
}

function Bolha({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", className)}>{children}</span>;
}
