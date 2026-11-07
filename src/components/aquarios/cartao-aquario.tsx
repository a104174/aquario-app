"use client";

import { IconChevronDireita } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { cx } from "@/lib/cx";
import { estadoTpa, faunaAtual, serie, ultimaTpa, ultimosValores } from "@/lib/derivados";
import { useFizTpa } from "@/lib/fiz-tpa";
import { num, plural } from "@/lib/formato";
import type { Aquario, FaunaEvento, Foto, Medicao, Parametro, Tpa } from "@/lib/tipos";
import { Agua, type DadosParametro } from "./widget/agua";
import { FotosAquario } from "./widget/fotos-aquario";
import { IconeAquario } from "@/components/aquarium-visual-kit/icone-aquario";
import { GlifoAquario, GlifoPeixe } from "./widget/glifos";
import { AnelTpa } from "./widget/manutencao";
import "./widget/widget.css";

const PRIORIDADE: Parametro[] = ["no3", "ph", "temperatura_c", "no2", "nh3_nh4", "kh", "gh"];
const MAX_FOTOS = 6;

/** Tom próprio de cada aquário (estável, derivado do id): turquesa, azul ou verde-água. */
const TONS = ["#2bb8cf", "#4d8ff0", "#2fb889", "#7b8cf2"];
function tom(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONS[h % TONS.length];
}

/**
 * Widget de aquário: identidade (nome, volume e glifo com o nível de água),
 * fotografias opcionais, ciclo de TPA + água, e fauna com a ação "Fiz TPA".
 * O cartão inteiro navega para o detalhe através de um link esticado; o
 * carrossel e o botão ficam por cima e nunca disparam a navegação.
 */
export function CartaoAquario({
  aquario,
  tpas,
  medicoes,
  fauna,
  fotos,
  intervalo,
  indice,
}: {
  aquario: Aquario;
  tpas?: Tpa[];
  medicoes?: Medicao[];
  fauna?: FaunaEvento[];
  fotos?: Foto[];
  intervalo: number;
  indice: number;
}) {
  const fizTpa = useFizTpa();
  const sugestao = fizTpa.sugestao(aquario.id);
  const { estado, dias } = estadoTpa(ultimaTpa(tpas, aquario.id), intervalo);
  const valores = ultimosValores(medicoes, aquario.id);
  const agua: DadosParametro[] = PRIORIDADE.filter((p) => valores[p])
    .slice(0, 4)
    .map((p) => ({ p, ...valores[p]!, serie: serie(medicoes, aquario.id, p).slice(-8).map((x) => x.v) }));
  const { lista, total } = faunaAtual(fauna, aquario.id);
  // a capa escolhida no detalhe (foto_capa_id) vem primeiro, como no hero
  const doAquario = (fotos ?? []).filter((f) => f.aquario_id === aquario.id);
  const capa = doAquario.find((f) => f.id === aquario.foto_capa_id);
  const minhas = (capa ? [capa, ...doAquario.filter((f) => f.id !== capa.id)] : doAquario).slice(0, MAX_FOTOS);

  const util = aquario.volume_util_l;
  const bruto = aquario.volume_bruto_l;
  const nivel = util != null && bruto ? util / bruto : null;

  return (
    <article
      className={cx("aw-cartao", "enter-up")}
      style={{ ["--i" as string]: indice, ["--tom" as string]: tom(aquario.id) }}
    >
      <NavLink href={`/aquario?id=${aquario.id}`} tipo="forward" className={"aw-link"} aria-label={`Abrir ${aquario.nome}`} />

      <div className={cx("aw-conteudo", "p-4 pb-3")}>
        {/* Identidade */}
        <header className="flex items-start gap-3">
          <GlifoAquario nivel={nivel} className="mt-0.5 h-10 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-title3 font-semibold leading-tight tracking-tight">{aquario.nome}</h2>
            <p className="mt-0.5 text-footnote text-text-2 tabular-nums">
              {util != null ? (
                <>
                  <span className="font-semibold text-text">{num(util, 1)} L</span> úteis
                  {bruto != null && <span className="text-text-3"> · {num(bruto, 1)} L brutos</span>}
                </>
              ) : bruto != null ? (
                `${num(bruto, 1)} L brutos`
              ) : (
                "Volume por definir"
              )}
            </p>
          </div>
          <IconChevronDireita size={18} className="mt-1 shrink-0 text-text-3" />
        </header>

        {minhas.length > 0 && <FotosAquario fotos={minhas} nome={aquario.nome} />}

        {/* Manutenção + água */}
        <div className="mt-3.5 flex items-start gap-3 border-t border-separator pt-3.5">
          <AnelTpa estado={estado} dias={dias} intervalo={intervalo} />
          <Agua dados={agua} />
        </div>

        {/* Fauna + ação */}
        <div className="mt-3 flex min-h-11 items-center gap-3 border-t border-separator pt-3">
          <Fauna especies={lista} total={total} />
          <button
            type="button"
            onClick={() => fizTpa.registar(aquario.id)}
            className={cx(
              "aw-interativo",
              // botão com relevo (afunda ao toque); vermelho quando a TPA está em atraso
              "botao-relevo ml-auto mb-1 flex h-11 shrink-0 items-center gap-1.5 !rounded-[14px] px-3.5 text-subhead font-bold",
              estado === "atrasada" ? "botao-perigo" : "botao-primario",
            )}
          >
            <IconeAquario tipo="gota" tamanho={17} />
            {sugestao ? `Fiz TPA · ${num(sugestao.litros, 1)} L` : "Fiz TPA"}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Cardume: um peixe por espécie (até 4), maior para a mais numerosa. */
function Fauna({ especies, total }: { especies: { especie: string; quantidade: number }[]; total: number }) {
  if (total === 0) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-footnote text-text-3">
        <GlifoPeixe cheio={false} className="h-3.5 w-6 shrink-0" />
        Sem fauna registada
      </div>
    );
  }
  const max = especies[0].quantidade;
  return (
    <div role="group" className="flex min-w-0 items-center gap-2.5" aria-label={`${plural(total, "animal", "animais")}, ${plural(especies.length, "espécie", "espécies")}`}>
      <div className="flex shrink-0 items-end -space-x-1 text-[var(--tom)]" aria-hidden>
        {especies.slice(0, 4).map((e, i) => {
          const k = 0.62 + 0.38 * (e.quantidade / max);
          return (
            <span key={e.especie} style={{ width: 22 * k, opacity: 1 - i * 0.18 }} className="block">
              <GlifoPeixe className="h-auto w-full" />
            </span>
          );
        })}
      </div>
      <p className="min-w-0 text-footnote leading-tight text-text-2" aria-hidden>
        <span className="text-body font-semibold tabular-nums text-text">{total}</span> {total === 1 ? "animal" : "animais"}
        <span className="block truncate text-caption text-text-3">
          {especies.length === 1 ? especies[0].especie : `${especies.length} espécies · ${especies[0].especie}`}
        </span>
      </p>
    </div>
  );
}
