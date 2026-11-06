// Envio de notificações: Web Push (VAPID) com fallback por email (Resend).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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
};

export async function enviarPush(userId: string, payload: Record<string, string>) {
  const { data } = await admin.from("push_subscricoes").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  const subs = (data ?? []) as Sub[];
  let enviados = 0;
  const expiradas: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12, urgency: "normal" },
        );
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: a subscrição já não existe (app apagada, permissão retirada)
        if (status === 404 || status === 410) expiradas.push(s.id);
        else console.error("push falhou", status, (e as Error).message);
      }
    }),
  );
  if (expiradas.length) await admin.from("push_subscricoes").delete().in("id", expiradas);
  return { enviados, removidos: expiradas.length };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function enviarEmail(para: string, assunto: string, alertas: Alerta[]) {
  const key = env("RESEND_API_KEY");
  if (!key) return false;
  const linhas = alertas
    .map(
      (a) =>
        `<li style="margin:0 0 10px"><a href="${APP_URL}${a.url ?? "/alertas"}" style="color:#0b8aa3;font-weight:600">${esc(a.titulo)}</a><br><span style="color:#5b6b78">${esc(a.mensagem)}</span></li>`,
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
 * Envia todos os alertas ainda não notificados (das últimas 72 h).
 * Push primeiro; se não chegar a nenhum dispositivo e o email estiver
 * ativo, um email com o resumo. Fica tudo registado em alertas.canal.
 */
export async function despachar() {
  const { data, error } = await admin
    .from("alertas")
    .select("id, user_id, tipo, titulo, mensagem, url")
    .is("notificado_em", null)
    .gt("criado_em", new Date(Date.now() - 72 * 3600e3).toISOString())
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
    let canal: "push" | "email" | "app" = "app";
    let push = 0;
    if (def?.lembretes_push) {
      // Até 3 alertas: um push cada. Mais: um resumo (não encher o ecrã).
      const lotes =
        alertas.length <= 3
          ? alertas.map((a) => ({ title: a.titulo, body: a.mensagem, url: a.url ?? "/alertas", tag: a.tipo + ":" + a.id }))
          : [
              {
                title: `${alertas.length} avisos do Aquário`,
                body: alertas.map((a) => a.titulo).join(" · "),
                url: "/alertas",
                tag: "resumo",
              },
            ];
      for (const p of lotes) push += (await enviarPush(userId, p)).enviados;
      if (push > 0) canal = "push";
    }
    if (canal === "app" && def?.lembretes_email) {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u.user?.email;
      if (email) {
        const assunto = alertas.length === 1 ? alertas[0].titulo : `${alertas.length} avisos do Aquário`;
        if (await enviarEmail(email, assunto, alertas)) canal = "email";
      }
    }
    await admin
      .from("alertas")
      .update({ notificado_em: new Date().toISOString(), canal })
      .in("id", alertas.map((a) => a.id));
    resumo.push({ userId, alertas: alertas.length, canal, push });
  }
  return resumo;
}
