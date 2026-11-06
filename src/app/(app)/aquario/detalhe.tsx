"use client";

import { EstadoErro } from "@/components/ui/estado-erro";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AquarioSheet } from "@/components/aquarios/aquario-sheet";
import { CapaAquarioSheet } from "@/components/aquarios/capa-aquario-sheet";
import { HeroAquario } from "@/components/aquarios/hero-aquario";
import { FaunaAquario } from "@/components/fauna/fauna-aquario";
import { Ninhadas } from "@/components/fauna/ninhadas";
import { Chips, Segmentado } from "@/components/forms/campos";
import { Timeline } from "@/components/eventos/timeline";
import { IconMaisOpcoes } from "@/components/icons";
import { TIPOS_REGISTO } from "@/components/registar/registar-sheet";
import { useNavegar } from "@/components/shell/nav";
import { BotaoHeader, Screen } from "@/components/shell/screen";
import { confirmar, escolher } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { SkeletonLista } from "@/components/ui/skeleton";
import { estadoTpa, faunaAtual, juntarEventos, serie, ultimaTpa } from "@/lib/derivados";
import { dataCurta, hora, num, plural, textoHaDias } from "@/lib/formato";
import { INFO_PARAMETROS } from "@/lib/parametros";
import { DEFINICOES_PADRAO, useApagar, useColecao, useDefinicoes } from "@/lib/query/dados";
import { abrirRegistar } from "@/lib/ui-store";
import { useFizTpa } from "@/lib/fiz-tpa";
import type { Parametro } from "@/lib/tipos";

const ORDEM_GRAFICOS: Parametro[] = ["no3", "ph", "temperatura_c", "no2", "nh3_nh4", "kh", "gh"];
import { cx } from "@/lib/cx";

const GraficoParametro = dynamic(() => import("@/components/charts/grafico-parametro").then((m) => m.GraficoParametro), {
  ssr: false,
  loading: () => <div className="skeleton h-[200px]" />,
});
const Galeria = dynamic(() => import("@/components/fotos/galeria").then((m) => m.Galeria), { ssr: false });

type Vista = "registos" | "graficos" | "fauna" | "fotos";

export function DetalheSkeleton() {
  return (
    <Screen titulo=" " voltar={{ href: "/aquarios", texto: "Aquários" }}>
      <div className="skeleton-delay">
        <SkeletonLista linhas={6} />
      </div>
    </Screen>
  );
}

export function DetalheAquario() {
  const id = useSearchParams().get("id") ?? "";
  const navegar = useNavegar();
  const aquarios = useColecao("aquarios");
  const tpas = useColecao("tpas").data;
  const medicoes = useColecao("medicoes").data;
  const fauna = useColecao("fauna").data;
  const fotosQuery = useColecao("fotos");
  const fotos = fotosQuery.data;
  const condicionadores = useColecao("produtos").data;
  const intervalo = useDefinicoes().data?.intervalo_tpa_dias ?? DEFINICOES_PADRAO.intervalo_tpa_dias;
  const apagar = useApagar("aquarios");
  const [vista, setVista] = useState<Vista>("registos");
  const [editar, setEditar] = useState(false);
  const [escolherCapa, setEscolherCapa] = useState(false);
  const fizTpa = useFizTpa();

  const aquario = aquarios.data?.find((a) => a.id === id);
  const eventos = useMemo(
    () => juntarEventos({ tpas, medicoes, fauna, fotos }, (aq, e) => aq === id || (e as { aquario_destino_id?: string }).aquario_destino_id === id),
    [tpas, medicoes, fauna, fotos, id],
  );
  const sugestaoTpa = fizTpa.sugestao(id);

  if (aquarios.isError && !aquarios.data)
    return (
      <Screen titulo="Aquário" voltar={{ href: "/aquarios", texto: "Aquários" }}>
        <EstadoErro onRetry={() => void aquarios.refetch()} aTentar={aquarios.isFetching} />
      </Screen>
    );
  if (aquarios.isPending) return <DetalheSkeleton />;
  if (!aquario) {
    return (
      <Screen titulo="Aquário" voltar={{ href: "/aquarios", texto: "Aquários" }}>
        <p className="py-10 text-center text-text-2">Este aquário já não existe.</p>
      </Screen>
    );
  }
  // Só esperamos pelos metadados no primeiro carregamento. As imagens
  // entram depois, num palco de altura fixa; offline usamos a cache ou o fallback.
  if (fotosQuery.isLoading) return <DetalheSkeleton />;

  const tpa = ultimaTpa(tpas, id);
  const { estado, dias } = estadoTpa(tpa, intervalo);
  const populacao = faunaAtual(fauna, id);
  const fotosDoAquario = (fotos ?? []).filter((f) => f.aquario_id === id);

  async function menu() {
    const temFotos = fotosDoAquario.length > 0;
    const i = await escolher({
      titulo: aquario!.nome,
      opcoes: [{ texto: "Editar aquário" }, ...(temFotos ? [{ texto: "Escolher capa" }] : []), { texto: "Apagar aquário", destrutivo: true }],
    });
    if (i === 0) setEditar(true);
    if (temFotos && i === 1) setEscolherCapa(true);
    if (i === (temFotos ? 2 : 1)) {
      const ok = await confirmar({
        titulo: `Apagar “${aquario!.nome}”?`,
        mensagem: "Todas as TPAs, medições, fauna e fotos deste aquário serão apagadas.",
        acao: "Apagar aquário e registos",
        destrutivo: true,
      });
      if (ok) {
        navegar("/aquarios", "back", true);
        apagar.mutate({ id });
      }
    }
  }

  return (
    <HeroAquario
      aquario={aquario}
      fotos={fotosDoAquario}
      titulo={aquario.nome}
      voltar={{ href: "/aquarios", texto: "Aquários" }}
      acoes={
        <BotaoHeader label="Opções do aquário" onClick={menu}>
          <IconMaisOpcoes size={26} />
        </BotaoHeader>
      }
      indicadores={
        <>
          <Estatistica
            rotulo="Última TPA"
            valor={dias === null ? "—" : textoHaDias(dias)}
            alerta={estado === "atrasada"}
          />
          <Estatistica
            rotulo="Volume"
            valor={aquario.volume_util_l != null ? `${num(aquario.volume_util_l, 1)} L` : aquario.volume_bruto_l != null ? `${num(aquario.volume_bruto_l, 1)} L` : "—"}
          />
          <Estatistica rotulo="Fauna" valor={populacao.total ? String(populacao.total) : "—"} />
        </>
      }
    >
      {/* 1 toque: repete a última TPA */}
      <Button block className="mb-3" onClick={() => fizTpa.registar(id)}>
        {sugestaoTpa ? `Fiz TPA · ${num(sugestaoTpa.litros, 1)} L${sugestaoTpa.dose != null ? ` · ${num(sugestaoTpa.dose, 2)} ml` : ""}` : "Registar primeira TPA"}
      </Button>

      {/* Ações rápidas: abrem a sheet de registo já com este aquário */}
      <div className="mb-5 grid grid-cols-4 gap-2">
        {TIPOS_REGISTO.filter((t) => t.tipo !== "ninhada").map((t, i) => {
          const Icon = t.icon;
          return (
            <button
              key={t.tipo}
              type="button"
              onClick={() => abrirRegistar({ tipo: t.tipo, aquarioId: id })}
              style={{ ["--i" as string]: i }}
              className="pressable enter-up flex flex-col items-start gap-3 rounded-[var(--r-bloco)] bg-surface px-3 pb-2.5 pt-3 text-[13px] font-semibold shadow-[var(--shadow-card)]"
            >
              {/* ícone limpo (sem círculo) + "+" discreto: é uma ação de registo */}
              <span className="flex w-full items-start justify-between text-text">
                <Icon size={22} />
                <span aria-hidden className="text-[15px] leading-none text-text-3">+</span>
              </span>
              {t.titulo}
            </button>
          );
        })}
      </div>

      <Segmentado
        className="mb-5"
        opcoes={[
          { valor: "registos", texto: "Registos" },
          { valor: "graficos", texto: "Gráficos" },
          { valor: "fauna", texto: "Fauna" },
          { valor: "fotos", texto: "Fotos" },
        ]}
        valor={vista}
        onValor={setVista}
      />

      <div key={`${id}:${vista}`} className="step-forward">
        {vista === "registos" &&
          (eventos.length ? (
            <Timeline eventos={eventos} aquarios={aquarios.data} condicionadores={condicionadores} aquarioContexto={id} />
          ) : (
            <Vazio texto="Ainda não há registos neste aquário." />
          ))}
        {vista === "graficos" && <Graficos aquarioId={id} />}
        {vista === "fotos" && <Galeria aquarioId={id} />}
        {vista === "fauna" && (
          <>
            <FaunaAquario id={id} fauna={fauna} fotos={fotos} />
            <Ninhadas aquarioId={id} />
          </>
        )}
      </div>

      <AquarioSheet open={editar} onOpenChange={setEditar} inicial={aquario} />
      {escolherCapa && <CapaAquarioSheet aquario={aquario} fotos={fotosDoAquario} onFechar={() => setEscolherCapa(false)} />}
    </HeroAquario>
  );
}

function Estatistica({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    // Sobre a fotografia: vidro escuro com texto branco. Sem fotografia
    // (grupo "claro"): bloco branco elevado com texto carvão.
    <div
      className={cx(
        "min-w-0 rounded-[16px] px-3 py-2.5 backdrop-blur-md",
        alerta ? "bg-[#5a1e1a]/70 group-data-[claro]/ind:bg-danger-soft" : "bg-black/35 group-data-[claro]/ind:bg-surface group-data-[claro]/ind:shadow-[var(--shadow-card)]",
        "group-data-[claro]/ind:backdrop-blur-none",
      )}
    >
      <p className="text-[12px] text-white/75 group-data-[claro]/ind:text-text-2">
        {alerta && <span aria-hidden>⚠︎ </span>}
        {rotulo}
      </p>
      <p className={cx("truncate text-[17px] font-semibold text-white", alerta ? "group-data-[claro]/ind:text-danger" : "group-data-[claro]/ind:text-text")}>{valor}</p>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="enter-up rounded-[14px] bg-surface px-4 py-8 text-center text-text-2">{texto}</p>;
}

function Graficos({ aquarioId }: { aquarioId: string }) {
  const medicoes = useColecao("medicoes").data;
  const disponiveis = ORDEM_GRAFICOS.filter((p) => medicoes?.some((m) => m.aquario_id === aquarioId && m[p] != null));
  const [param, setParam] = useState<Parametro | null>(null);
  const [tabela, setTabela] = useState(false);
  const atual = param && disponiveis.includes(param) ? param : disponiveis[0];

  if (!atual) return <Vazio texto="Regista uma medição para veres os gráficos." />;

  const info = INFO_PARAMETROS[atual];
  const pontos = serie(medicoes, aquarioId, atual);

  return (
    <div>
      <div className="mb-4">
        <Chips opcoes={disponiveis.map((p) => ({ valor: p, texto: INFO_PARAMETROS[p].curto }))} valor={atual} onValor={setParam} />
      </div>
      <div className="rounded-[18px] bg-surface p-4">
        <h2 className="text-[17px] font-semibold">
          {info.nome} <span className="font-normal text-text-2">({info.curto}{info.unidade ? ` · ${info.unidade}` : ""})</span>
        </h2>
        <p className="mb-2 text-[13px] text-text-2">
          {plural(pontos.length, "medição", "medições")} · faixa sombreada = referência {num(info.referencia[0], 2)}–
          {num(info.referencia[1], 2)}
        </p>
        <GraficoParametro key={atual} pontos={pontos} info={info} />
      </div>

      <button
        type="button"
        onClick={() => setTabela((t) => !t)}
        aria-expanded={tabela}
        className="pressable mt-3 w-full rounded-[14px] bg-surface py-3 text-[15px] font-medium text-accent"
      >
        {tabela ? "Esconder valores" : "Ver valores em tabela"}
      </button>
      {tabela && (
        <table className="enter-up mt-3 w-full overflow-hidden rounded-[14px] bg-surface text-[15px]">
          <thead>
            <tr className="text-left text-[13px] text-text-2">
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 text-right font-medium">{info.curto}</th>
            </tr>
          </thead>
          <tbody>
            {[...pontos].reverse().map((p) => (
              <tr key={p.t} className="border-t border-separator">
                <td className="px-4 py-2">
                  {dataCurta(p.data)} <span className="text-text-3">{hora(p.data)}</span>
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {num(p.v, info.decimais)} {info.unidade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
