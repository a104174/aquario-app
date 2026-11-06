"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CondicionadorSheet } from "@/components/definicoes/condicionador-sheet";
import { Lembretes } from "@/components/definicoes/lembretes";
import { Grupo, Stepper } from "@/components/forms/campos";
import { IconChevronDireita, IconGota, IconMaisCirculo, IconSair } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { confirmar } from "@/components/ui/action-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { sair } from "@/lib/auth/sair";
import { useSession } from "@/lib/auth/session";
import { num } from "@/lib/formato";
import { DEFINICOES_PADRAO, useColecao, useDefinicoes, useGuardarDefinicoes } from "@/lib/query/dados";
import { usePendentes } from "@/lib/query/sincronizacao";
import type { Condicionador } from "@/lib/tipos";

export default function DefinicoesPage() {
  const { session } = useSession();
  const condicionadores = useColecao("condicionadores");
  const definicoes = useDefinicoes();
  const guardarDef = useGuardarDefinicoes();
  const pendentes = usePendentes();
  const qc = useQueryClient();
  const router = useRouter();
  const [cond, setCond] = useState<{ aberto: boolean; item?: Condicionador }>({ aberto: false });
  const intervalo = definicoes.data?.intervalo_tpa_dias ?? DEFINICOES_PADRAO.intervalo_tpa_dias;
  const instalada = useInstalada();

  async function terminarSessao() {
    const ok = await confirmar({
      titulo: "Terminar sessão?",
      mensagem:
        pendentes > 0
          ? `Tens ${pendentes} alteração(ões) por enviar que serão perdidas.`
          : "Os dados ficam guardados na conta; a cache deste iPhone é apagada.",
      acao: "Terminar sessão",
      destrutivo: true,
    });
    if (!ok) return;
    await sair(qc);
    router.replace("/login");
  }

  return (
    <Screen titulo="Definições" subtitulo={session?.user.email ?? " "}>
      {!instalada && (
        <div className="enter-up mb-5 rounded-[14px] bg-accent-soft px-4 py-3 text-[15px]">
          <p className="font-semibold">Instala no ecrã principal</p>
          <p className="text-text-2">
            No Safari, toca em <span className="font-medium">Partilhar</span> →{" "}
            <span className="font-medium">Adicionar ao ecrã principal</span>. Assim a app abre em ecrã inteiro e pode enviar
            lembretes.
          </p>
        </div>
      )}

      <Grupo titulo="Condicionadores" rodape="A dose de cada TPA é calculada com estes valores.">
        {condicionadores.isPending ? (
          <div className="px-4 py-3">
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          condicionadores.data?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCond({ aberto: true, item: c })}
              className="pressable-row relative flex min-h-[48px] w-full items-center gap-3 px-4 text-left after:absolute after:bottom-0 after:left-[52px] after:right-0 after:h-px after:bg-separator"
            >
              <IconGota size={22} className="text-accent" />
              <span className="flex-1 text-[17px]">{c.nome}</span>
              <span className="tabular-nums text-text-2">{num(c.dose_ml_por_litro, 4)} ml/L</span>
              <IconChevronDireita size={18} className="text-text-3" />
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => setCond({ aberto: true })}
          className="pressable-row flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-accent"
        >
          <IconMaisCirculo size={22} />
          <span className="text-[17px]">Adicionar condicionador</span>
        </button>
      </Grupo>

      <Grupo titulo="Lembrete de TPA" rodape="Um aquário fica “em atraso” quando passa este número de dias desde a última TPA.">
        <div className="flex min-h-[52px] items-center justify-between px-4">
          <span className="text-[17px]">Intervalo</span>
          <Stepper
            valor={intervalo}
            onValor={(v) => guardarDef.mutate({ intervalo_tpa_dias: v })}
            min={1}
            max={60}
            sufixo=" d"
          />
        </div>
      </Grupo>

      <Lembretes />

      <Grupo>
        <button
          type="button"
          onClick={terminarSessao}
          className="pressable-row flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-danger"
        >
          <IconSair size={22} />
          <span className="text-[17px]">Terminar sessão</span>
        </button>
      </Grupo>

      <p className="pb-2 text-center text-[12px] text-text-3">Aquário · diário pessoal</p>

      <CondicionadorSheet open={cond.aberto} onOpenChange={(o) => setCond((c) => ({ ...c, aberto: o }))} inicial={cond.item} />
    </Screen>
  );
}

function useInstalada() {
  return useSyncExternalStore(
    () => () => {},
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => true,
  );
}
