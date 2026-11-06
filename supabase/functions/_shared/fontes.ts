// Orquestra as verificações de fontes externas.
// Só cria novidade (e alerta) quando o hash é novo para essa fonte.
import { admin } from "./notificar.ts";
import * as v from "./verificadores.ts";

type Fonte = {
  id: string;
  user_id: string;
  tipo: string;
  nome: string;
  url: string | null;
  configuracao: Record<string, unknown>;
  ultima_verificacao: string | null;
  estado: unknown;
};

const INTERVALO_PADRAO_H = 6;

function vencida(f: Fonte) {
  if (!f.ultima_verificacao) return true;
  const h = Number(f.configuracao?.intervalo_horas ?? INTERVALO_PADRAO_H);
  // margem de 15 min para o cron de 3 em 3 h não "falhar" por segundos
  return Date.now() - new Date(f.ultima_verificacao).getTime() >= h * 3600e3 - 15 * 60e3;
}

async function correr(f: Fonte): Promise<v.Saida> {
  const cfg = f.configuracao ?? {};
  switch (f.tipo) {
    case "meteo":
      return v.meteo(cfg);
    case "eredes":
      return v.eredes(cfg);
    case "agere_avisos":
      return v.agereAvisos(cfg, f.url ?? undefined);
    case "agere_qualidade":
      return v.agereQualidade(cfg, (f.estado as { url?: string }) ?? null, f.url ?? undefined);
    case "loja":
      return v.loja(cfg, f.nome, f.url ?? "", (f.estado as never) ?? null);
    default:
      throw new Error(`Tipo desconhecido: ${f.tipo}`);
  }
}

export async function verificarFontes(opts: { userId?: string; forcar?: boolean } = {}) {
  let q = admin.from("fontes_externas").select("*").eq("ativo", true).order("criado_em");
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  const fontes = ((data ?? []) as Fonte[]).filter((f) => opts.forcar || vencida(f));

  const resumo: Record<string, unknown>[] = [];
  for (const f of fontes) {
    const agora = new Date().toISOString();
    try {
      const s = await correr(f);
      let novas: { hash: string }[] = [];
      if (s.itens.length) {
        const { data: ins, error: e1 } = await admin
          .from("novidades_externas")
          .upsert(
            s.itens.map((i) => ({ user_id: f.user_id, fonte_id: f.id, titulo: i.titulo, url: i.url ?? null, resumo: i.resumo ?? null, dados: i.dados ?? null, hash: i.hash })),
            { onConflict: "fonte_id,hash", ignoreDuplicates: true },
          )
          .select("hash");
        if (e1) throw e1;
        novas = ins ?? [];
      }
      const hashesNovos = new Set(novas.map((n) => n.hash));
      const alertas = s.itens
        .filter((i) => i.alerta && hashesNovos.has(i.hash))
        .map((i) => ({
          user_id: f.user_id,
          tipo: i.alerta!.tipo,
          titulo: i.alerta!.titulo,
          mensagem: i.alerta!.mensagem,
          url: "/fontes",
          chave: `fonte:${f.id}:${i.hash}`.slice(0, 500),
        }));
      if (alertas.length) {
        const { error: e2 } = await admin.from("alertas").upsert(alertas, { onConflict: "user_id,chave", ignoreDuplicates: true });
        if (e2) throw e2;
      }
      const upd: Record<string, unknown> = { ultima_verificacao: agora, ultimo_erro: null };
      if (s.resultado !== undefined) upd.resultado = s.resultado;
      if (s.estado !== undefined) upd.estado = s.estado;
      await admin.from("fontes_externas").update(upd).eq("id", f.id);
      resumo.push({ fonte: f.nome, novidades: novas.length, alertas: alertas.length });
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 300) ?? String(e);
      console.error(f.nome, msg);
      await admin.from("fontes_externas").update({ ultima_verificacao: agora, ultimo_erro: msg }).eq("id", f.id);
      resumo.push({ fonte: f.nome, erro: msg });
    }
  }
  return resumo;
}
