// Edge Function "automacoes" — chamada pelo pg_cron (sem IA).
//
//  POST { "tarefa": "diaria" }  → regras (TPA, esponja, produtos, ninhadas,
//                                  férias, foto da semana) + envio
//  POST { "tarefa": "fontes" }  → fontes externas (ver _shared/fontes.ts)
//  POST { "tarefa": "teste" }   → notificação de teste (JWT do utilizador)
//
// O cron autentica-se com o header x-cron-secret (= secret CRON_SECRET).

import { admin, despachar, enviarPush, env } from "../_shared/notificar.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não suportado" }, 405);
  const corpo = (await req.json().catch(() => ({}))) as { tarefa?: string; teste?: boolean };
  const tarefa = corpo.tarefa ?? (corpo.teste ? "teste" : "diaria");

  const cron = env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!cron) {
    if (tarefa !== "teste") return json({ erro: "Não autorizado" }, 401);
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!data.user) return json({ erro: "Não autorizado" }, 401);
    const r = await enviarPush(data.user.id, { title: "Aquário", body: "Notificações a funcionar 🐟", url: "/definicoes", tag: "teste" });
    return json({ teste: true, ...r });
  }

  try {
    if (tarefa === "diaria") {
      const { data: gerados, error } = await admin.rpc("gerar_alertas");
      if (error) throw error;
      return json({ tarefa, gerados, envio: await despachar() });
    }
    if (tarefa === "fontes") {
      const { verificarFontes } = await import("../_shared/fontes.ts");
      const fontes = await verificarFontes();
      return json({ tarefa, fontes, envio: await despachar() });
    }
    return json({ erro: "Tarefa desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ erro: (e as Error).message }, 500);
  }
});
