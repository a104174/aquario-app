"use client";

import { useState } from "react";
import { AquarioSheet } from "@/components/aquarios/aquario-sheet";
import { CartaoAquario } from "@/components/aquarios/cartao-aquario";
import { IconAquario, IconMais, IconSino } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { BotaoHeader, Screen } from "@/components/shell/screen";
import { Button } from "@/components/ui/button";
import { SkeletonCartao } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useColecao, useDefinicoes, DEFINICOES_PADRAO } from "@/lib/query/dados";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { Aquario } from "@/lib/tipos";

export default function AquariosPage() {
  const aquarios = useColecao("aquarios");
  const tpas = useColecao("tpas").data;
  const medicoes = useColecao("medicoes").data;
  const fauna = useColecao("fauna").data;
  const intervalo = useDefinicoes().data?.intervalo_tpa_dias ?? DEFINICOES_PADRAO.intervalo_tpa_dias;
  const [novo, setNovo] = useState(false);
  const naoLidos = (useColecao("alertas").data ?? []).filter((a) => !a.lido).length;

  const n = aquarios.data?.length ?? 0;

  return (
    <Screen
      titulo="Aquários"
      subtitulo={aquarios.data ? (n === 1 ? "1 aquário" : `${n} aquários`) : " "}
      acoes={
        <>
          <NavLink href="/alertas" tipo="forward" aria-label="Alertas" className="pressable relative flex h-11 w-11 items-center justify-center rounded-full text-white">
            <IconSino size={24} />
            {naoLidos > 0 && (
              <span className="pop-in absolute right-1 top-1.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white">
                {naoLidos}
              </span>
            )}
          </NavLink>
          <BotaoHeader label="Novo aquário" onClick={() => setNovo(true)}>
            <IconMais size={24} strokeWidth={2} />
          </BotaoHeader>
        </>
      }
    >
      {aquarios.isPending ? (
        <div className="skeleton-delay space-y-3">
          <SkeletonCartao />
          <SkeletonCartao />
          <SkeletonCartao />
        </div>
      ) : n === 0 ? (
        <Vazio onNovo={() => setNovo(true)} />
      ) : (
        <div className="space-y-3">
          {aquarios.data!.map((a, i) => (
            <CartaoAquario key={a.id} aquario={a} tpas={tpas} medicoes={medicoes} fauna={fauna} intervalo={intervalo} indice={i} />
          ))}
        </div>
      )}
      <AquarioSheet open={novo} onOpenChange={setNovo} />
    </Screen>
  );
}

function Vazio({ onNovo }: { onNovo: () => void }) {
  const qc = useQueryClient();
  const [aCriar, setACriar] = useState(false);

  async function criarMeus() {
    setACriar(true);
    const { data, error } = await supabase().rpc("criar_aquarios_iniciais");
    setACriar(false);
    if (error) return toast("Não foi possível criar os aquários (estás online?).", "erro");
    qc.setQueryData<Aquario[]>(["aquarios"], data as Aquario[]);
    toast("✓ Aquários criados", "ok");
  }

  return (
    <div className="enter-up flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent">
        <IconAquario size={40} />
      </span>
      <h2 className="text-[20px] font-semibold">Ainda não há aquários</h2>
      <p className="mt-1 max-w-xs text-text-2">Cria o teu primeiro aquário ou adiciona de uma vez os três aquários de casa.</p>
      <div className="mt-6 w-full max-w-xs space-y-2">
        <Button block onClick={criarMeus} loading={aCriar}>
          {aCriar ? "A criar…" : "Adicionar os meus 3 aquários"}
        </Button>
        <Button block variant="secondary" onClick={onNovo}>
          Criar aquário
        </Button>
      </div>
      <p className="mt-4 text-[13px] text-text-3">Principal (Aquatlantis Vienna) · AQUARIUS 20 L · Betta</p>
    </div>
  );
}
