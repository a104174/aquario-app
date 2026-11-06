"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Lembretes } from "@/components/definicoes/lembretes";
import { Grupo, Interruptor, Stepper } from "@/components/forms/campos";
import { IconCaixa, IconEstrela, IconGlobo, IconMala, IconSair, IconSino } from "@/components/icons";
import { LinhaNav } from "@/components/shell/linha-nav";
import { Screen } from "@/components/shell/screen";
import { confirmar } from "@/components/ui/action-sheet";
import { sair } from "@/lib/auth/sair";
import { useSession } from "@/lib/auth/session";
import { estadoStock } from "@/lib/produtos";
import { DEFINICOES_PADRAO, useColecao, useDefinicoes, useGuardarDefinicoes } from "@/lib/query/dados";
import { usePendentes } from "@/lib/query/sincronizacao";

export default function DefinicoesPage() {
  const { session } = useSession();
  const definicoes = useDefinicoes();
  const guardarDef = useGuardarDefinicoes();
  const pendentes = usePendentes();
  const qc = useQueryClient();
  const router = useRouter();
  const instalada = useInstalada();
  const { data: produtos } = useColecao("produtos");
  const { data: tpas } = useColecao("tpas");
  const { data: alertas } = useColecao("alertas");
  const { data: desejos } = useColecao("desejos");
  const { data: ferias } = useColecao("ferias");
  const { data: fontes } = useColecao("fontes");
  const fontesComAviso = (fontes ?? []).filter(
    (f) => f.ativo && (f.ultimo_erro || (f.resultado as { sem_codigo_postal?: boolean; sem_termos?: boolean } | null)?.sem_codigo_postal || (f.resultado as { sem_termos?: boolean } | null)?.sem_termos),
  ).length;
  const d = { ...DEFINICOES_PADRAO, ...definicoes.data };

  const produtosBaixos = (produtos ?? []).filter((p) => p.ativo && ["baixo", "vazio"].includes(estadoStock(p, tpas).nivel)).length;
  const naoLidos = (alertas ?? []).filter((a) => !a.lido).length;
  const queros = (desejos ?? []).filter((x) => x.estado === "quero").length;
  const hoje = new Date().toISOString().slice(0, 10);
  const proximas = (ferias ?? []).filter((f) => f.regresso >= hoje).at(-1);

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
            No Safari, toca em <span className="font-medium">Partilhar</span> → <span className="font-medium">Adicionar ao ecrã principal</span>.
          </p>
        </div>
      )}

      <Grupo titulo="Ferramentas">
        <LinhaNav href="/alertas" icone={<IconSino size={22} />} texto="Alertas" detalhe="Histórico de tudo o que foi avisado" badge={naoLidos} />
        <LinhaNav
          href="/produtos"
          icone={<IconCaixa size={22} />}
          texto="Produtos"
          detalhe={produtosBaixos ? `${produtosBaixos} a acabar` : "Condicionador, comida, bactérias"}
          badge={produtosBaixos}
        />
        <LinhaNav href="/desejos" icone={<IconEstrela size={22} />} texto="Lista de desejos" detalhe={queros ? `${queros} por comprar` : "Peixes, plantas, material"} />
        <LinhaNav
          href="/ferias"
          icone={<IconMala size={22} />}
          texto="Modo férias"
          detalhe={proximas ? `${proximas.ida.split("-").reverse().slice(0, 2).join("/")} → ${proximas.regresso.split("-").reverse().slice(0, 2).join("/")}` : "Checklist e regresso"}
        />
        <LinhaNav
          href="/fontes"
          icone={<IconGlobo size={22} />}
          texto="Fontes externas"
          detalhe={fontesComAviso ? `${fontesComAviso} a precisar de atenção` : "Tempo, cortes de luz e água, lojas"}
          badge={fontesComAviso}
        />
      </Grupo>

      <Grupo titulo="Lembrete de TPA" rodape="Primeiro aviso ao fim do intervalo e um segundo, urgente, mais tarde. Nada é enviado se as TPAs estiverem em dia.">
        <div className="relative flex min-h-[52px] items-center justify-between px-4 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
          <span className="text-[17px]">Aviso aos</span>
          <Stepper valor={d.intervalo_tpa_dias} onValor={(v) => guardarDef.mutate({ intervalo_tpa_dias: v })} min={1} max={60} sufixo=" d" />
        </div>
        <div className="relative flex min-h-[52px] items-center justify-between px-4 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
          <span className="text-[17px]">Urgente aos</span>
          <Stepper
            valor={d.aviso_tpa_urgente_dias}
            onValor={(v) => guardarDef.mutate({ aviso_tpa_urgente_dias: v })}
            min={d.intervalo_tpa_dias}
            max={90}
            sufixo=" d"
          />
        </div>
        <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
          <span className="flex-1">
            <span className="block text-[17px]">Esponja do filtro</span>
            <span className="block text-[13px] text-text-2">Uma vez por mês: lavar na água da TPA</span>
          </span>
          <Interruptor ligado={d.lembrete_esponja} label="Lembrete mensal da esponja" onMudar={(v) => guardarDef.mutate({ lembrete_esponja: v })} />
        </div>
      </Grupo>

      <Lembretes />

      <Grupo>
        <button type="button" onClick={terminarSessao} className="pressable-row flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-danger">
          <IconSair size={22} />
          <span className="text-[17px]">Terminar sessão</span>
        </button>
      </Grupo>

      <p className="pb-2 text-center text-[12px] text-text-3">Aquário · diário pessoal</p>
    </Screen>
  );
}

function useInstalada() {
  return useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => true,
  );
}
