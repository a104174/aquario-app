"use client";

import { useEffect, useState } from "react";
import { Grupo, Interruptor } from "@/components/forms/campos";
import { IconSino } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ativarPush, desativarPush, enviarTeste, estadoPush, type EstadoPush } from "@/lib/push";
import { useDefinicoes, useGuardarDefinicoes } from "@/lib/query/dados";
import { toast } from "@/lib/toast";

const EXPLICACAO: Partial<Record<EstadoPush, string>> = {
  "nao-instalada": "No iPhone, as notificações só funcionam com a app instalada no ecrã principal (iOS 16.4 ou superior).",
  "sem-suporte": "Este browser não suporta notificações push.",
  recusada: "As notificações foram recusadas. Ativa-as em Definições do iPhone → Notificações → Aquário.",
};

export function Lembretes() {
  const definicoes = useDefinicoes();
  const guardar = useGuardarDefinicoes();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [aTrabalhar, setATrabalhar] = useState(false);

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
    setATrabalhar(true);
    try {
      await ativarPush();
      guardar.mutate({ lembretes_push: true });
      setEstado("ligada");
      toast("✓ Notificações ativadas", "ok");
    } catch (e) {
      if ((e as Error).message === "permissao") {
        setEstado(Notification.permission === "denied" ? "recusada" : "desligada");
        toast("Sem permissão para notificações.", "erro");
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

  return (
    <Grupo
      titulo="Notificações"
      rodape="Por volta das 18h, recebes um aviso quando um aquário passa o intervalo de TPA. Se a notificação não chegar a nenhum dispositivo, é enviado um email (se estiver ativo)."
    >
      <div className="relative flex min-h-[52px] items-center gap-3 px-4 py-2 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
        <IconSino size={22} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-[17px]">Notificações push</p>
          {estado === null ? (
            <Skeleton className="mt-1 h-3 w-1/2" />
          ) : (
            <p className="text-[13px] text-text-2">
              {ligada ? "Ativas neste iPhone" : (explicacao ?? "Desligadas")}
            </p>
          )}
        </div>
        {estado === "desligada" && (
          <Button className="h-9 px-4 text-[15px]" onClick={ativar} loading={aTrabalhar}>
            Ativar
          </Button>
        )}
        {ligada && <Interruptor ligado label="Notificações push" onMudar={desativar} disabled={aTrabalhar} />}
      </div>

      {ligada && (
        <button
          type="button"
          onClick={testar}
          disabled={aTrabalhar}
          className="pressable-row relative flex min-h-[48px] w-full items-center px-4 text-left text-[17px] text-accent disabled:opacity-50 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator"
        >
          Enviar notificação de teste
        </button>
      )}

      <div className="relative flex min-h-[52px] items-center gap-3 px-4 py-2 after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator">
        <span className="flex-1">
          <span className="block text-[17px]">Foto da semana</span>
          <span className="block text-[13px] text-text-2">Ao domingo, se um aquário não tiver fotos dessa semana</span>
        </span>
        <Interruptor
          ligado={definicoes.data?.lembrete_foto_semanal ?? true}
          label="Lembrete semanal de foto"
          onMudar={(v) => guardar.mutate({ lembrete_foto_semanal: v })}
        />
      </div>

      <div className="flex min-h-[52px] items-center gap-3 px-4">
        <span className="flex-1 text-[17px]">Email (alternativa)</span>
        <Interruptor
          ligado={!!definicoes.data?.lembretes_email}
          label="Lembretes por email"
          onMudar={(v) => guardar.mutate({ lembretes_email: v })}
        />
      </div>
    </Grupo>
  );
}
