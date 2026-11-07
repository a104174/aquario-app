"use client";

import { useEffect, useMemo, useRef } from "react";
import { CartaoAlerta } from "@/components/alertas/cartao-alerta";
import { EstadoErro } from "@/components/ui/estado-erro";
import { IconVisto } from "@/components/icons";
import { useNavegar } from "@/components/shell/nav";
import { BotaoHeader, Screen } from "@/components/shell/screen";
import { SkeletonLista } from "@/components/ui/skeleton";
import { amanhaDeManha, estadoAtivo } from "@/lib/alertas";
import { cabecalhoDia } from "@/lib/formato";
import { feedbackTatil } from "@/lib/haptics";
import { useColecao, useGuardar } from "@/lib/query/dados";
import type { Alerta } from "@/lib/tipos";

function agruparPorDia(alertas: Alerta[]) {
  const grupos: { dia: string; data: string; itens: Alerta[] }[] = [];
  for (const alerta of alertas) {
    const dia = new Date(alerta.criado_em).toDateString();
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) ultimo.itens.push(alerta);
    else grupos.push({ dia, data: alerta.criado_em, itens: [alerta] });
  }
  return grupos;
}

export default function AlertasPage() {
  const alertas = useColecao("alertas");
  const guardar = useGuardar("alertas");
  const guardarAlerta = guardar.mutate;
  const navegar = useNavegar();
  const acaoDaNotificacao = useRef(false);
  const lista = useMemo(() => alertas.data ?? [], [alertas.data]);
  const naoLidos = lista.filter((a) => !a.lido);
  const ativos = lista.filter((a) => estadoAtivo(a.estado));
  const historico = lista.filter((a) => !estadoAtivo(a.estado));

  function abrir(a: Alerta) {
    if (!a.lido) guardar.mutate({ ...a, lido: true });
    if (a.url) navegar(a.url, "forward");
  }

  function resolver(a: Alerta) {
    feedbackTatil("sucesso");
    guardar.mutate({
      ...a,
      lido: true,
      estado: "resolvido",
      adiado_ate: null,
      resolvido_em: new Date().toISOString(),
    });
  }

  function ignorar(a: Alerta) {
    feedbackTatil();
    guardar.mutate({
      ...a,
      lido: true,
      estado: "ignorado",
      adiado_ate: null,
      resolvido_em: new Date().toISOString(),
    });
  }

  function adiar(a: Alerta) {
    feedbackTatil();
    guardar.mutate({
      ...a,
      lido: true,
      estado: "adiado",
      adiado_ate: amanhaDeManha().toISOString(),
      resolvido_em: null,
      notificado_em: null,
      canal: null,
      ultimo_erro: null,
    });
  }

  // A ação "Lembrar amanhã" de browsers que suportam botões no push
  // abre esta rota com o id. No iOS, tocar no push continua a abrir o
  // destino principal porque os botões de ações podem não ser mostrados.
  useEffect(() => {
    if (acaoDaNotificacao.current || !alertas.data) return;
    const id = new URLSearchParams(window.location.search).get("adiar");
    if (!id) return;
    acaoDaNotificacao.current = true;
    const alerta = alertas.data.find((a) => a.id === id);
    if (alerta) {
      feedbackTatil();
      guardarAlerta({
        ...alerta,
        lido: true,
        estado: "adiado",
        adiado_ate: amanhaDeManha().toISOString(),
        resolvido_em: null,
        notificado_em: null,
        canal: null,
        ultimo_erro: null,
      });
    }
    window.history.replaceState(null, "", "/alertas");
  }, [alertas.data, guardarAlerta]);

  function mostrarPorDia(alertas: Alerta[], tratados = false) {
    return agruparPorDia(alertas).map((grupo, i) => (
      <div key={grupo.dia} className="enter-up" style={{ ["--i" as string]: Math.min(i, 6) }}>
        <h3 className="mb-1.5 px-1 text-footnote font-medium text-text-2">{cabecalhoDia(grupo.data)}</h3>
        <div className="space-y-2">
          {grupo.itens.map((a) => (
            <CartaoAlerta
              key={a.id}
              alerta={a}
              historico={tratados}
              onAbrir={() => abrir(a)}
              onResolver={() => resolver(a)}
              onAdiar={() => adiar(a)}
              onIgnorar={() => ignorar(a)}
            />
          ))}
        </div>
      </div>
    ));
  }

  return (
    <Screen
      titulo="Alertas"
      subtitulo={alertas.data ? (ativos.length ? `${ativos.length} ${ativos.length === 1 ? "ação" : "ações"}` : "Tudo tratado") : " "}
      voltar={{ href: "/", texto: "Início" }}
      acoes={
        naoLidos.length > 0 && (
          <BotaoHeader label="Marcar tudo como lido" onClick={() => naoLidos.forEach((a) => guardar.mutate({ ...a, lido: true }))}>
            <IconVisto size={24} strokeWidth={2.2} />
          </BotaoHeader>
        )
      }
    >
      {alertas.isError && !alertas.data ? (
        <EstadoErro onRetry={() => void alertas.refetch()} aTentar={alertas.isFetching} />
      ) : alertas.isPending ? (
        <div className="skeleton-delay">
          <SkeletonLista linhas={5} />
        </div>
      ) : lista.length === 0 ? (
        <div className="enter-up rounded-[14px] bg-surface px-4 py-10 text-center">
          <p className="text-body font-semibold">Está tudo bem 🐟</p>
          <p className="mt-1 text-text-2">Quando houver algo a fazer, aparece aqui e no telemóvel.</p>
        </div>
      ) : (
        <>
          <section className="enter-up mb-6">
            <h2 className="mb-2 px-1 text-footnote font-semibold uppercase tracking-wide text-text-2">A fazer</h2>
            {ativos.length ? (
              <div className="space-y-4">{mostrarPorDia(ativos)}</div>
            ) : (
              <div className="rounded-[14px] bg-ok-soft px-4 py-4 text-center text-ok">
                <p className="font-semibold">Tudo tratado 🐟</p>
                <p className="mt-0.5 text-subhead opacity-80">Não há ações pendentes.</p>
              </div>
            )}
          </section>

          {historico.length > 0 && (
            <section className="enter-up mb-5" style={{ ["--i" as string]: 1 }}>
              <h2 className="mb-2 px-1 text-footnote font-semibold uppercase tracking-wide text-text-2">Tratados recentemente</h2>
              <div className="space-y-4">{mostrarPorDia(historico, true)}</div>
            </section>
          )}
        </>
      )}
    </Screen>
  );
}
