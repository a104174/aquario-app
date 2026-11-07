"use client";

import { Mascote } from "@/components/mascote/mascote";
import { EstadoErro } from "@/components/ui/estado-erro";
import { useState } from "react";
import { DesejoSheet } from "@/components/desejos/desejo-sheet";
import { FotoImg } from "@/components/eventos/foto-img";
import { Segmentado } from "@/components/forms/campos";
import { IconEstrela, IconMais } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/shell/screen";
import { escolher } from "@/components/ui/action-sheet";
import { SkeletonLista } from "@/components/ui/skeleton";
import { num } from "@/lib/formato";
import { useApagar, useColecao, useGuardar } from "@/lib/query/dados";
import type { Desejo } from "@/lib/tipos";

export default function DesejosPage() {
  const desejos = useColecao("desejos");
  const guardar = useGuardar("desejos");
  const apagar = useApagar("desejos");
  const [vista, setVista] = useState<Desejo["estado"]>("quero");
  const [sheet, setSheet] = useState<{ aberto: boolean; item?: Desejo }>({ aberto: false });
  const lista = (desejos.data ?? []).filter((d) => d.estado === vista);

  async function opcoes(d: Desejo) {
    const acoes = [
      ...(d.link ? [{ texto: "Abrir link", f: () => window.open(d.link!, "_blank", "noopener") }] : []),
      d.estado === "quero"
        ? { texto: "Marcar como comprado", f: () => guardar.mutate({ ...d, estado: "comprado" }) }
        : { texto: "Voltar a querer", f: () => guardar.mutate({ ...d, estado: "quero" }) },
      { texto: "Editar", f: () => setSheet({ aberto: true, item: d }) },
      { texto: "Apagar", destrutivo: true, f: () => apagar.mutate({ id: d.id }) },
    ];
    const i = await escolher({ titulo: d.item, opcoes: acoes });
    if (i !== null) acoes[i].f();
  }

  return (
    <Screen
      titulo="Lista de desejos"
      voltar={{ href: "/definicoes", texto: "Definições" }}
      // ação principal no terço inferior (uso a uma mão)
      acaoFlutuante={
        <Button variant="secondary" block onClick={() => setSheet({ aberto: true })}>
          <IconMais size={20} strokeWidth={2.6} />
          Novo desejo
        </Button>
      }
    >
      <Segmentado
        className="mb-5"
        opcoes={[
          { valor: "quero", texto: "Quero" },
          { valor: "comprado", texto: "Comprado" },
        ]}
        valor={vista}
        onValor={setVista}
      />
      {desejos.isError && !desejos.data ? (
        <EstadoErro onRetry={() => void desejos.refetch()} aTentar={desejos.isFetching} />
      ) : desejos.isPending ? (
        <div className="skeleton-delay">
          <SkeletonLista linhas={3} />
        </div>
      ) : lista.length === 0 ? (
        <div className="enter-up flex flex-col items-center rounded-[14px] bg-surface px-4 py-10 text-center">
          <Mascote humor="contente" tamanho={104} entrar className="mb-2" />
          <p className="text-text-2">{vista === "quero" ? "Guarda aqui prints e links do que queres comprar." : "Nada comprado ainda."}</p>
        </div>
      ) : (
        <div key={vista} className="step-forward space-y-3">
          {lista.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => opcoes(d)}
              style={{ ["--i" as string]: Math.min(i, 6) }}
              className="pressable enter-up flex w-full gap-3 rounded-[16px] bg-surface p-3 text-left"
            >
              {d.foto_path ? (
                <FotoImg foto={{ id: d.id, storage_path: d.foto_path, thumb_path: d.thumb_path }} thumb className="h-[72px] w-[72px] shrink-0 rounded-[12px]" />
              ) : (
                <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
                  <IconEstrela size={28} />
                </span>
              )}
              <span className="min-w-0 flex-1 py-0.5">
                <span className="block truncate text-body font-semibold">{d.item}</span>
                <span className="block truncate text-subhead text-text-2">
                  {[d.loja, d.preco != null && `${num(d.preco, 2)} €`].filter(Boolean).join(" · ") || (d.link ? new URL(d.link).hostname : "")}
                </span>
                {d.notas && <span className="mt-0.5 line-clamp-2 block text-subhead text-text-2">{d.notas}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      <DesejoSheet open={sheet.aberto} onOpenChange={(o) => setSheet((s) => ({ ...s, aberto: o }))} inicial={sheet.item} />
    </Screen>
  );
}
