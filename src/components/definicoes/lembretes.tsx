"use client";

import { useEffect, useState } from "react";
import { Grupo, Interruptor } from "@/components/forms/campos";
import { IconSino } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ativarPush, desativarPush, enviarTeste, estadoPush, type EstadoPush } from "@/lib/push";
import { useDefinicoes, useGuardarDefinicoes } from "@/lib/query/dados";
import { toast } from "@/lib/toast";

const EXPLICACAO: Partial<Record<EstadoPush, string>> = {
  "nao-instalada": "Só funcionam com a app no ecrã principal",
  "sem-suporte": "Este browser não suporta notificações push.",
  recusada: "Bloqueadas nas definições do iPhone",
};

/** Passos para resolver, quando há algo a fazer fora da app. */
const PASSOS: Partial<Record<EstadoPush, { titulo: string; passos: string[] }>> = {
  "nao-instalada": {
    titulo: "Instalar no ecrã principal",
    passos: ["No Safari, toca em Partilhar", "Escolhe Adicionar ao ecrã principal", "Abre o Aquário a partir do ícone e volta aqui"],
  },
  recusada: {
    titulo: "Voltar a permitir",
    passos: ["Abre as Definições do iPhone", "Toca em Notificações → Aquário", "Ativa Permitir notificações"],
  },
};

const O_QUE_RECEBES = [
  { t: "TPA em atraso", d: "Por volta das 18h, só quando um aquário passa o intervalo." },
  { t: "Foto da semana", d: "Ao domingo, se ainda não fotografaste um aquário." },
  { t: "Alertas importantes", d: "Ninhadas, avisos da água e cortes de luz na tua zona." },
];

export function Lembretes() {
  const definicoes = useDefinicoes();
  const guardar = useGuardarDefinicoes();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);
  // Explicação antes do pedido do sistema: o iOS só pergunta uma vez
  const [explicar, setExplicar] = useState(false);

  useEffect(() => {
    let vivo = true;
    estadoPush()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado("sem-suporte"));
    return () => {
      vivo = false;
    };
  }, []);

  async function ativar() {
    setExplicar(false);
    setATrabalhar(true);
    try {
      await ativarPush();
      guardar.mutate({ lembretes_push: true });
      setEstado("ligada");
      toast("✓ Notificações ativadas", "ok");
    } catch (e) {
      if ((e as Error).message === "permissao") {
        const recusou = Notification.permission === "denied";
        setEstado(recusou ? "recusada" : "desligada");
        if (!recusou) toast("Sem permissão para notificações.", "erro");
      } else {
        console.error(e);
        toast("Não foi possível ativar (estás online?).", "erro");
      }
    } finally {
      setATrabalhar(false);
    }
  }

  async function desativar() {
    setATrabalhar(true);
    try {
      await desativarPush();
      guardar.mutate({ lembretes_push: false });
      setEstado("desligada");
    } catch {
      toast("Não foi possível desativar (estás online?).", "erro");
    } finally {
      setATrabalhar(false);
    }
  }

  async function testar() {
    setATrabalhar(true);
    try {
      const n = await enviarTeste();
      toast(n > 0 ? "✓ Notificação de teste enviada" : "Nenhum dispositivo recebeu a notificação.", n > 0 ? "ok" : "erro");
    } catch {
      toast("A função de lembretes não respondeu.", "erro");
    } finally {
      setATrabalhar(false);
    }
  }

  const ligada = estado === "ligada";
  const explicacao = estado ? EXPLICACAO[estado] : undefined;
  const passos = estado ? PASSOS[estado] : undefined;
  const emailLigado = !!definicoes.data?.lembretes_email;

  return (
    <Grupo
      titulo="Notificações"
      rodape="Por volta das 18h, recebes um aviso quando um aquário passa o intervalo de TPA. Se a notificação não chegar a nenhum dispositivo, é enviado um email (se estiver ativo)."
    >
      <div className="relative flex min-h-[52px] items-center gap-3 px-4 py-2 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
        <IconSino size={22} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-body">Notificações push</p>
          {estado === null ? (
            <Skeleton className="mt-1 h-3 w-1/2" />
          ) : (
            <p className="text-footnote text-text-2">
              {ligada ? "Ativas neste iPhone" : (explicacao ?? "Desligadas")}
            </p>
          )}
        </div>
        {estado === "desligada" && (
          <Button className="h-9 px-4 text-subhead" onClick={() => setExplicar(true)} loading={aTrabalhar}>
            Ativar
          </Button>
        )}
        {ligada && <Interruptor ligado label="Notificações push" onMudar={desativar} disabled={aTrabalhar} />}
      </div>

      {passos && (
        <div className="pop-in relative px-4 pb-3 pt-1 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
          <p className="text-subhead font-semibold">{passos.titulo}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-subhead text-text-2">
            {passos.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          {!emailLigado && (
            <Button
              variant="secondary"
              className="mt-3 h-11 w-full text-subhead"
              onClick={() => {
                guardar.mutate({ lembretes_email: true });
                toast("✓ Vais receber os lembretes por email", "ok");
              }}
            >
              Usar email entretanto
            </Button>
          )}
        </div>
      )}

      {ligada && (
        <button
          type="button"
          onClick={testar}
          disabled={aTrabalhar}
          className="pressable-row relative flex min-h-[48px] w-full items-center px-4 text-left text-body text-accent disabled:opacity-50 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator"
        >
          Enviar notificação de teste
        </button>
      )}

      <div className="relative flex min-h-[52px] items-center gap-3 px-4 py-2 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
        <span className="flex-1">
          <span className="block text-body">Foto da semana</span>
          <span className="block text-footnote text-text-2">Ao domingo, se um aquário não tiver fotos dessa semana</span>
        </span>
        <Interruptor
          ligado={definicoes.data?.lembrete_foto_semanal ?? true}
          label="Lembrete semanal de foto"
          onMudar={(v) => guardar.mutate({ lembrete_foto_semanal: v })}
        />
      </div>

      <div className="flex min-h-[52px] items-center gap-3 px-4">
        <span className="flex-1 text-body">Email (alternativa)</span>
        <Interruptor
          ligado={emailLigado}
          label="Lembretes por email"
          onMudar={(v) => guardar.mutate({ lembretes_email: v })}
        />
      </div>
      <Sheet
        open={explicar}
        onOpenChange={setExplicar}
        titulo="Notificações"
        esquerda={<BotaoSheet onClick={() => setExplicar(false)}>Agora não</BotaoSheet>}
        rodape={
          <Button block onClick={ativar} loading={aTrabalhar}>
            Permitir notificações
          </Button>
        }
      >
        <div className="flex flex-col items-center px-2 pb-2 pt-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconSino size={32} />
          </span>
          <p className="mt-3 text-title2 font-bold leading-tight">Lembretes na hora certa</p>
          <p className="mt-1 text-subhead text-text-2">A seguir, o iPhone pergunta se permites notificações. Só enviamos isto:</p>
        </div>
        <ul className="mt-4 overflow-hidden rounded-[14px] bg-surface">
          {O_QUE_RECEBES.map((x) => (
            <li key={x.t} className="relative px-4 py-3 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator last:after:hidden">
              <p className="text-body">{x.t}</p>
              <p className="text-footnote text-text-2">{x.d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-4 text-footnote text-text-2">Podes desligar a qualquer momento aqui nas Definições.</p>
      </Sheet>
    </Grupo>
  );
}
