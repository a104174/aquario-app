// Envio de notificações: Web Push (VAPID) com fallback por email (Resend).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { apresentarAlerta } from "./apresentacao-alerta.ts";

export const env = (k: string) => Deno.env.get(k) ?? "";
export const APP_URL = env("APP_URL") || "https://aquario-delta.vercel.app";

export const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

webpush.setVapidDetails(
  env("VAPID_SUBJECT") || "mailto:eu@exemplo.pt",
  env("VAPID_PUBLIC_KEY"),
  env("VAPID_PRIVATE_KEY"),
);

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
export type Alerta = {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  url: string | null;
  estado: "pendente" | "adiado";
  adiado_ate: string | null;
  tentativas_envio: number;
};

type Urgencia = "very-low" | "low" | "normal" | "high";

export async function enviarPush(userId: string, payload: Record<string, string>, urgency: Urgencia = "normal") {
  const { data } = await admin.from("push_subscricoes").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  const subs = (data ?? []) as Sub[];
  let enviados = 0;
  const expiradas: string[] = [];
  let falhas = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12, urgency },
        );
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: a subscrição já não existe (app apagada, permissão retirada)
        if (status === 404 || status === 410) expiradas.push(s.id);
        else {
          falhas++;
          console.error("push falhou", status, (e as Error).message);
        }
      }
    }),
  );
  if (expiradas.length) await admin.from("push_subscricoes").delete().in("id", expiradas);
  return { enviados, removidos: expiradas.length, falhas };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function enviarEmail(para: string, assunto: string, alertas: Alerta[]) {
  const key = env("RESEND_API_KEY");
  if (!key) return false;
  const linhas = alertas
    .map(
      (a) => {
        const p = apresentarAlerta(a);
        return `<li style="margin:0 0 10px"><a href="${APP_URL}${a.url ?? "/alertas"}" style="color:#0b8aa3;font-weight:600">${esc(p.title)}</a><br><span style="color:#5b6b78">${esc(a.mensagem)}</span></li>`;
      },
    )
    .join("");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("RESEND_FROM") || "Aquário <onboarding@resend.dev>",
      to: [para],
      subject: assunto,
      html: `<div style="font-family:-apple-system,system-ui,sans-serif;color:#0c1a24;max-width:480px">
        <h2 style="font-size:20px">${esc(assunto)}</h2><ul style="padding-left:18px">${linhas}</ul>
        <p style="color:#8b9aa5;font-size:12px">Recebes este email porque ativaste os lembretes por email na app Aquário.</p></div>`,
    }),
  });
  if (!res.ok) console.error("Resend falhou", res.status, await res.text());
  return res.ok;
}

/**
 * Envia alertas novos e os que chegaram ao fim de um adiamento.
 * Push primeiro; se não chegar a nenhum dispositivo e o email estiver
 * ativo, envia email. Uma falha real fica pendente para nova tentativa.
 */
export async function despachar() {
  const agora = new Date().toISOString();
  const { data, error } = await admin
    .from("alertas")
    .select("id, user_id, tipo, titulo, mensagem, url, estado, adiado_ate, tentativas_envio")
    .is("notificado_em", null)
    .lt("tentativas_envio", 3)
    .or(`estado.eq.pendente,and(estado.eq.adiado,adiado_ate.lte.${agora})`)
    .order("criado_em");
  if (error) throw error;
  const porUser = new Map<string, Alerta[]>();
  for (const a of (data ?? []) as Alerta[]) porUser.set(a.user_id, [...(porUser.get(a.user_id) ?? []), a]);

  const resumo: Record<string, unknown>[] = [];
  for (const [userId, alertas] of porUser) {
    const { data: def } = await admin
      .from("definicoes")
      .select("lembretes_push, lembretes_email")
      .eq("user_id", userId)
      .maybeSingle();
    const enviados = new Map<"push" | "email" | "app", Set<string>>([
      ["push", new Set()],
      ["email", new Set()],
      ["app", new Set()],
    ]);
    let porEnviar = [...alertas];
    let push = 0;

    if (def?.lembretes_push) {
      // Um ou dois avisos mantêm identidade e destino próprios. A partir de
      // três, um resumo evita encher o ecrã bloqueado com notificações.
      if (alertas.length <= 2) {
        for (const a of alertas) {
          const p = apresentarAlerta(a);
          const r = await enviarPush(
            userId,
            {
              title: p.title,
              body: p.body,
              url: p.url,
              tag: `${a.tipo}:${a.id}`,
              categoria: p.categoria,
              alertaId: a.id,
            },
            p.urgency,
          );
          push += r.enviados;
          if (r.enviados > 0) enviados.get("push")!.add(a.id);
        }
      } else {
        const r = await enviarPush(
          userId,
          {
            title: `🔔 ${alertas.length} avisos do Aquário`,
            body: alertas.slice(0, 2).map((a) => a.titulo).join(" · ") + (alertas.length > 2 ? " · …" : ""),
            url: "/alertas",
            tag: "resumo-alertas",
            categoria: "Resumo",
          },
        );
        push += r.enviados;
        if (r.enviados > 0) alertas.forEach((a) => enviados.get("push")!.add(a.id));
      }
      porEnviar = alertas.filter((a) => !enviados.get("push")!.has(a.id));
    }

    if (porEnviar.length && def?.lembretes_email) {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u.user?.email;
      if (email) {
        const assunto = porEnviar.length === 1 ? apresentarAlerta(porEnviar[0]).title : `🔔 ${porEnviar.length} avisos do Aquário`;
        if (await enviarEmail(email, assunto, porEnviar)) {
          porEnviar.forEach((a) => enviados.get("email")!.add(a.id));
          porEnviar = [];
        }
      }
    }

    // Se nenhum canal externo está ativo, o alerta já está disponível na
    // app e não deve ser tentado diariamente.
    if (!def?.lembretes_push && !def?.lembretes_email) {
      porEnviar.forEach((a) => enviados.get("app")!.add(a.id));
      porEnviar = [];
    }

    for (const [canal, ids] of enviados) {
      if (!ids.size) continue;
      await admin
        .from("alertas")
        .update({
          notificado_em: agora,
          canal,
          estado: "pendente",
          adiado_ate: null,
          lido: false,
          ultimo_erro: null,
        })
        .in("id", [...ids]);
    }

    if (porEnviar.length) {
      await Promise.all(
        porEnviar.map((a) =>
          admin
            .from("alertas")
            .update({ tentativas_envio: a.tentativas_envio + 1, ultimo_erro: "Não foi possível entregar por push ou email." })
            .eq("id", a.id),
        ),
      );
    }

    resumo.push({
      userId,
      alertas: alertas.length,
      push,
      email: enviados.get("email")!.size,
      app: enviados.get("app")!.size,
      falharam: porEnviar.length,
    });
  }
  return resumo;
}
