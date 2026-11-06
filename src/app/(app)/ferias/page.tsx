"use client";

import { useState } from "react";
import { FeriasSheet } from "@/components/ferias/ferias-sheet";
import { IconMais, IconMala, IconVisto } from "@/components/icons";
import { BotaoHeader, Screen, Seccao } from "@/components/shell/screen";
import { escolher } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { dataCurta, diasDesde } from "@/lib/formato";
import { hojeISO } from "@/lib/produtos";
import { useApagar, useColecao, useGuardar } from "@/lib/query/dados";
import type { Ferias } from "@/lib/tipos";

const d = (iso: string) => dataCurta(iso + "T12:00:00");

export default function FeriasPage() {
  const ferias = useColecao("ferias");
  const guardar = useGuardar("ferias");
  const apagar = useApagar("ferias");
  const [sheet, setSheet] = useState<{ aberto: boolean; item?: Ferias }>({ aberto: false });
  const [novoItem, setNovoItem] = useState("");
  const hoje = hojeISO();
  const futuras = (ferias.data ?? []).filter((f) => f.regresso >= hoje).sort((a, b) => a.ida.localeCompare(b.ida));
  const atual = futuras[0];
  const passadas = (ferias.data ?? []).filter((f) => f.regresso < hoje);

  function alternar(f: Ferias, i: number) {
    guardar.mutate({ ...f, checklist: f.checklist.map((c, j) => (j === i ? { ...c, feito: !c.feito } : c)) });
  }

  async function opcoes(f: Ferias) {
    const i = await escolher({ titulo: `${d(f.ida)} → ${d(f.regresso)}`, opcoes: [{ texto: "Editar" }, { texto: "Apagar", destrutivo: true }] });
    if (i === 0) setSheet({ aberto: true, item: f });
    if (i === 1) apagar.mutate({ id: f.id });
  }

  const estado = atual
    ? hoje >= atual.ida
      ? `De férias até ${d(atual.regresso)}`
      : `Faltam ${-diasDesde(atual.ida + "T12:00:00")} dias`
    : null;
  const feitos = atual?.checklist.filter((c) => c.feito).length ?? 0;

  return (
    <Screen
      titulo="Modo férias"
      subtitulo={estado ?? "Sem férias marcadas"}
      voltar={{ href: "/definicoes", texto: "Definições" }}
      acoes={
        <BotaoHeader label="Planear férias" onClick={() => setSheet({ aberto: true })}>
          <IconMais size={24} strokeWidth={2} />
        </BotaoHeader>
      }
    >
      {!atual ? (
        <div className="enter-up flex flex-col items-center rounded-[14px] bg-surface px-4 py-10 text-center">
          <IconMala size={34} className="mb-2 text-accent" />
          <p className="mb-4 text-text-2">Marca as datas para preparares os aquários e pausares os avisos de TPA.</p>
          <Button onClick={() => setSheet({ aberto: true })}>Planear férias</Button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => opcoes(atual)} className="pressable enter-up mb-5 block w-full rounded-[18px] bg-surface p-4 text-left">
            <p className="text-[22px] font-bold">
              {d(atual.ida)} → {d(atual.regresso)}
            </p>
            {atual.quem_alimenta && <p className="text-text-2">Quem alimenta: {atual.quem_alimenta}</p>}
            {atual.notas && <p className="selectable mt-1 text-[15px] text-text-2">{atual.notas}</p>}
          </button>

          <Seccao titulo={`Checklist · ${feitos}/${atual.checklist.length}`}>
            <div className="overflow-hidden rounded-[14px] bg-surface">
              {atual.checklist.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  role="checkbox"
                  aria-checked={c.feito}
                  onClick={() => alternar(atual, i)}
                  className="pressable-row relative flex min-h-[50px] w-full items-center gap-3 px-4 text-left after:absolute after:bottom-0 after:left-[52px] after:right-0 after:h-px after:bg-separator last:after:hidden"
                >
                  <span
                    className={cx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-[var(--dur-quick)]",
                      c.feito ? "border-ok bg-ok text-white" : "border-text-3",
                    )}
                  >
                    {c.feito && <IconVisto size={16} strokeWidth={3} className="pop-in" />}
                  </span>
                  <span className={cx("text-[16px] transition-colors duration-[var(--dur-std)]", c.feito && "text-text-3 line-through")}>{c.texto}</span>
                </button>
              ))}
              <form
                className="flex items-center gap-2 px-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!novoItem.trim()) return;
                  guardar.mutate({ ...atual, checklist: [...atual.checklist, { texto: novoItem.trim(), feito: false }] });
                  setNovoItem("");
                }}
              >
                <IconMais size={20} className="text-accent" />
                <input
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  placeholder="Adicionar item"
                  className="h-[50px] flex-1 bg-transparent text-[16px] outline-none placeholder:text-text-3"
                />
              </form>
            </div>
          </Seccao>
        </>
      )}

      {passadas.length > 0 && (
        <Seccao titulo="Anteriores">
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {passadas.map((f) => (
              <button key={f.id} type="button" onClick={() => opcoes(f)} className="pressable-row flex min-h-[48px] w-full items-center px-4 text-left text-[16px] text-text-2">
                {d(f.ida)} → {d(f.regresso)}
                {f.quem_alimenta ? ` · ${f.quem_alimenta}` : ""}
              </button>
            ))}
          </div>
        </Seccao>
      )}
      <FeriasSheet open={sheet.aberto} onOpenChange={(o) => setSheet((s) => ({ ...s, aberto: o }))} inicial={sheet.item} />
    </Screen>
  );
}
