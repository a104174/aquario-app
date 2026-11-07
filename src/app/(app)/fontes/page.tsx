"use client";

import { EstadoErro } from "@/components/ui/estado-erro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Exterior } from "@/components/fontes/exterior";
import { FonteSheet } from "@/components/fontes/fonte-sheet";
import { IconChevronDireita, IconGlobo, IconGota, IconMais, IconRaio, IconEstrela, IconTermometro } from "@/components/icons";
import { BotaoHeader, Screen, Seccao } from "@/components/shell/screen";
import { Button } from "@/components/ui/button";
import { SkeletonLista } from "@/components/ui/skeleton";
import { cx } from "@/lib/cx";
import { cabecalhoDia, diasDesde, hora } from "@/lib/formato";
import { verificarFontesAgora } from "@/lib/push";
import { useColecao } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { FonteExterna } from "@/lib/tipos";

const ICONE: Record<string, React.ReactNode> = {
  meteo: <IconTermometro size={22} />,
  eredes: <IconRaio size={22} />,
  agere_avisos: <IconGota size={22} />,
  agere_qualidade: <IconGota size={22} />,
  loja: <IconEstrela size={22} />,
};

const ORDEM = ["meteo", "eredes", "agere_avisos", "agere_qualidade", "loja"];

function estadoFonte(f: FonteExterna) {
  const r = (f.resultado ?? {}) as Record<string, unknown>;
  if (!f.ativo) return { texto: f.tipo === "loja" && f.configuracao?.plataforma === "nenhuma" ? "Sem loja online" : "Desativada", erro: false };
  if (f.ultimo_erro) return { texto: `Erro: ${f.ultimo_erro}`, erro: true };
  if (f.tipo === "eredes" && r.sem_codigo_postal) return { texto: "Indica o teu código postal", erro: true };
  if (f.tipo === "agere_avisos" && r.sem_termos) return { texto: "Indica a tua freguesia ou rua", erro: true };
  if (!f.ultima_verificacao) return { texto: "Ainda não verificada", erro: false };
  const h = Math.round((Date.now() - new Date(f.ultima_verificacao).getTime()) / 3600e3);
  const quando = h < 1 ? "há pouco" : h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
  const extra = f.tipo === "loja" && r.total != null ? ` · ${r.total} produtos seguidos` : f.tipo === "eredes" ? ` · ${r.afetam_os_meus_cp ?? 0} cortes na tua zona` : "";
  return { texto: `Verificada ${quando}${extra}`, erro: false };
}

export default function FontesPage() {
  const fontes = useColecao("fontes");
  const { data: novidades = [] } = useColecao("novidades");
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<{ aberto: boolean; item?: FonteExterna }>({ aberto: false });
  const [aVerificar, setAVerificar] = useState(false);

  async function verificar() {
    setAVerificar(true);
    try {
      const r = await verificarFontesAgora();
      const n = r.reduce((s, x) => s + (x.novidades ?? 0), 0);
      toast(n ? `✓ ${n} novidade${n === 1 ? "" : "s"}` : "✓ Sem novidades", "ok");
      await qc.invalidateQueries({ queryKey: ["fontes"] });
      await qc.invalidateQueries({ queryKey: ["novidades"] });
      await qc.invalidateQueries({ queryKey: ["alertas"] });
    } catch {
      toast("Não foi possível verificar (estás online?).", "erro");
    } finally {
      setAVerificar(false);
    }
  }

  const nomeFonte = (id: string) => fontes.data?.find((f) => f.id === id)?.nome ?? "";

  return (
    <Screen
      titulo="Fontes externas"
      subtitulo="Tempo, luz, água e lojas"
      voltar={{ href: "/definicoes", texto: "Definições" }}
      acoes={
        <BotaoHeader label="Adicionar loja" onClick={() => setSheet({ aberto: true })}>
          <IconMais size={24} strokeWidth={2} />
        </BotaoHeader>
      }
    >
      <Exterior />

      <Seccao titulo="Fontes">
        {fontes.isError && !fontes.data ? (
        <EstadoErro onRetry={() => void fontes.refetch()} aTentar={fontes.isFetching} />
      ) : fontes.isPending ? (
          <SkeletonLista linhas={5} />
        ) : (
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {[...(fontes.data ?? [])]
              .sort((a, b) => Number(b.ativo) - Number(a.ativo) || ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo) || a.nome.localeCompare(b.nome, "pt-PT"))
              .map((f) => {
              const e = estadoFonte(f);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSheet({ aberto: true, item: f })}
                  className={cx(
                    "pressable-row relative flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left after:absolute after:bottom-0 after:left-[52px] after:right-0 after:h-px after:bg-separator last:after:hidden",
                    !f.ativo && "opacity-55",
                  )}
                >
                  <span className="text-accent">{ICONE[f.tipo] ?? <IconGlobo size={22} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">{f.nome}</span>
                    <span className={cx("block truncate text-footnote", e.erro ? "text-warning" : "text-text-2")}>{e.texto}</span>
                  </span>
                  <IconChevronDireita size={18} className="text-text-3" />
                </button>
              );
            })}
          </div>
        )}
      </Seccao>

      <Button variant="secondary" block className="mb-6" onClick={verificar} loading={aVerificar}>
        {aVerificar ? "A verificar…" : "Verificar agora"}
      </Button>

      <Seccao titulo="Novidades">
        {novidades.length === 0 ? (
          <p className="rounded-[14px] bg-surface px-4 py-6 text-center text-subhead text-text-2">Sem novidades. Só aparece aqui o que mudar.</p>
        ) : (
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {novidades.slice(0, 40).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => n.url && window.open(n.url, "_blank", "noopener")}
                className="pressable-row relative block w-full px-4 py-3 text-left after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-separator last:after:hidden"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-subhead font-semibold">{n.titulo}</span>
                  <span className="shrink-0 text-caption text-text-3">{diasDesde(n.detectado_em) < 2 ? cabecalhoDia(n.detectado_em) : cabecalhoDia(n.detectado_em).split(",")[0]} {hora(n.detectado_em)}</span>
                </span>
                {n.resumo && <span className="block text-subhead text-text-2">{n.resumo}</span>}
                <span className="block text-caption text-text-3">{nomeFonte(n.fonte_id)}</span>
              </button>
            ))}
          </div>
        )}
      </Seccao>

      <FonteSheet open={sheet.aberto} onOpenChange={(o) => setSheet((s) => ({ ...s, aberto: o }))} inicial={sheet.item} />
    </Screen>
  );
}
