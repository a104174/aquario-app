// Edge Function: lembrete de TPA
//
// Modos:
//  • Agendado (pg_cron): POST com header `x-cron-secret: $CRON_SECRET`.
//    Envia Web Push a quem tem aquários com TPA em atraso; se o push não
//    chegar a nenhum dispositivo (ou estiver desligado) e o email estiver
//    ativo, envia email pela Resend.
//  • Teste (a partir da app): POST com o JWT do utilizador e `{ "teste": true }`.
//    Envia uma notificação de teste para os dispositivos desse utilizador.
//
// Segredos (supabase secrets set …):
//   CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
//   RESEND_API_KEY, RESEND_FROM (ex.: "Aquário <lembretes@o-teu-dominio.pt>")
//   APP_URL (ex.: https://aquario.vercel.app)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são fornecidos automaticamente.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Pendente = {
  user_id: string;
  email: string | null;
  aquario_id: string;
  aquario_nome: string;
  dias: number;
  intervalo: number;
  lembretes_push: boolean;
  lembretes_email: boolean;
};

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

const env = (k: string) => Deno.env.get(k) ?? "";
const APP_URL = env("APP_URL") || "https://localhost:3000";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

webpush.setVapidDetails(
  env("VAPID_SUBJECT") || "mailto:eu@exemplo.pt",
  env("VAPID_PUBLIC_KEY"),
  env("VAPID_PRIVATE_KEY"),
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não suportado" }, 405);

  const cronSecret = env("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
    return json(await correrLembretes());
  }

  // Modo teste: autenticado com o JWT do utilizador
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ erro: "Não autorizado" }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ erro: "Não autorizado" }, 401);
  const r = await enviarPush(data.user.id, {
    title: "Aquário",
    body: "Notificações a funcionar 🐟",
    url: "/definicoes",
    tag: "teste",
  });
  return json({ teste: true, ...r });
});

async function correrLembretes() {
  const { data, error } = await admin.rpc("lembretes_tpa_pendentes");
  if (error) {
    console.error(error);
    return { erro: error.message };
  }
  const pendentes = (data ?? []) as Pendente[];

  // Agrupar por utilizador
  const porUser = new Map<string, Pendente[]>();
  for (const p of pendentes) porUser.set(p.user_id, [...(porUser.get(p.user_id) ?? []), p]);

  const resumo: Record<string, unknown>[] = [];
  for (const [userId, lista] of porUser) {
    const { title, body, url } = mensagem(lista);
    let push = { enviados: 0, removidos: 0 };
    if (lista[0].lembretes_push) push = await enviarPush(userId, { title, body, url, tag: "lembrete-tpa" });

    let email = false;
    if (push.enviados === 0 && lista[0].lembretes_email && lista[0].email) {
      email = await enviarEmail(lista[0].email, title, lista);
    }

    if (push.enviados > 0 || email) {
      await admin
        .from("aquarios")
        .update({ ultimo_lembrete_em: new Date().toISOString() })
        .in("id", lista.map((p) => p.aquario_id));
    }
    resumo.push({ userId, aquarios: lista.length, ...push, email });
  }
  const fotos = await lembretesFoto();
  return { utilizadores: porUser.size, resumo, fotos };
}

/** Ao domingo (Lisboa): lembrar foto da semana dos aquários sem fotos nos últimos 7 dias. */
async function lembretesFoto() {
  const dia = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Lisbon" }).format(new Date());
  if (dia !== "Sun") return { domingo: false };
  const { data, error } = await admin.rpc("lembretes_foto_pendentes");
  if (error) return { erro: error.message };
  const porUser = new Map<string, { nome: string; id: string; push: boolean; email: boolean; mail: string | null }[]>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const l = porUser.get(r.user_id as string) ?? [];
    l.push({ nome: r.aquario_nome as string, id: r.aquario_id as string, push: !!r.lembretes_push, email: !!r.lembretes_email, mail: (r.email as string) ?? null });
    porUser.set(r.user_id as string, l);
  }
  let enviados = 0;
  for (const [userId, lista] of porUser) {
    const nomes = lista.map((a) => a.nome).join(", ");
    const payload = {
      title: "📸 Foto da semana",
      body: `Ainda não há fotos desta semana: ${nomes}.`,
      url: lista.length === 1 ? `/aquario?id=${lista[0].id}` : "/",
      tag: "foto-semanal",
    };
    if (lista[0].push) enviados += (await enviarPush(userId, payload)).enviados;
  }
  return { domingo: true, utilizadores: porUser.size, enviados };
}

function mensagem(lista: Pendente[]) {
  if (lista.length === 1) {
    const p = lista[0];
    return {
      title: `TPA no ${p.aquario_nome}`,
      body: `Já passaram ${p.dias} dias desde a última troca de água (intervalo: ${p.intervalo}).`,
      url: `/aquario?id=${p.aquario_id}`,
    };
  }
  return {
    title: `TPA em atraso em ${lista.length} aquários`,
    body: lista.map((p) => `${p.aquario_nome} (${p.dias} dias)`).join(" · "),
    url: "/",
  };
}

async function enviarPush(userId: string, payload: Record<string, string>) {
  const { data } = await admin.from("push_subscricoes").select("*").eq("user_id", userId);
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
        // 404/410: subscrição já não existe (app apagada, permissão retirada)
        if (status === 404 || status === 410) expiradas.push(s.id);
        else console.error("push falhou", status, (e as Error).message);
      }
    }),
  );
  if (expiradas.length) await admin.from("push_subscricoes").delete().in("id", expiradas);
  return { enviados, removidos: expiradas.length };
}

async function enviarEmail(para: string, assunto: string, lista: Pendente[]) {
  const key = env("RESEND_API_KEY");
  if (!key) return false;
  const linhas = lista
    .map(
      (p) =>
        `<li style="margin:0 0 8px"><a href="${APP_URL}/aquario?id=${p.aquario_id}" style="color:#0b8aa3;font-weight:600">${escapar(
          p.aquario_nome,
        )}</a> — ${p.dias} dias desde a última TPA</li>`,
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
        <h2 style="font-size:20px">Está na hora da TPA</h2>
        <ul style="padding-left:18px">${linhas}</ul>
        <p style="color:#5b6b78;font-size:13px">Recebes este email porque ativaste os lembretes por email na app Aquário.</p>
      </div>`,
    }),
  });
  if (!res.ok) console.error("Resend falhou", res.status, await res.text());
  return res.ok;
}

function escapar(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
