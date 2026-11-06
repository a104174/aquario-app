// Servidor MCP (Streamable HTTP) para o Claude ler os dados do Aquário.
// Autenticação: OAuth 2.1 (servidor de autorização = Supabase Auth).
// Ferramentas apenas de leitura.
import type { AuthInfo } from "@modelcontextprotocol/server";
import { createClient } from "@supabase/supabase-js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import * as d from "@/lib/mcp/dados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEITURA = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const aquarioArg = z.string().optional().describe("Nome (ou parte do nome) ou id do aquário. Vazio = todos.");
const diasArg = (padrao: number) => z.number().int().min(1).max(365).default(padrao).describe("Quantos dias para trás");

const json = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v) }] });

function sbDe(ctx: { http?: { authInfo?: AuthInfo } }) {
  const token = ctx.http?.authInfo?.token;
  if (!token) throw new Error("Sem autenticação");
  return d.clienteDoUtilizador(token);
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "resumo_aquarios",
      { title: "Resumo dos aquários", description: "Estado atual de cada aquário: última TPA, últimos parâmetros (com avaliação), fauna, ninhadas ativas e stock de produtos.", annotations: LEITURA },
      async (ctx) => json(await d.resumoAquarios(sbDe(ctx))),
    );
    server.registerTool(
      "ultimas_tpas",
      { title: "Últimas TPAs", description: "Trocas parciais de água (litros, % do volume útil, condicionador e dose).", inputSchema: z.object({ aquario: aquarioArg, dias: diasArg(30) }), annotations: LEITURA },
      async ({ aquario, dias }, ctx) => json(await d.ultimasTpas(sbDe(ctx), aquario, dias)),
    );
    server.registerTool(
      "medicoes",
      { title: "Medições", description: "Medições de parâmetros (NH3/NH4, NO2, NO3, pH, GH, KH, temperatura) com valores fora da referência assinalados.", inputSchema: z.object({ aquario: aquarioArg, dias: diasArg(30) }), annotations: LEITURA },
      async ({ aquario, dias }, ctx) => json(await d.medicoes(sbDe(ctx), aquario, dias)),
    );
    server.registerTool(
      "fauna_e_ninhadas",
      { title: "Fauna e ninhadas", description: "População atual por espécie, eventos de fauna dos últimos 60 dias e ninhadas com o próximo marco.", inputSchema: z.object({ aquario: aquarioArg }), annotations: LEITURA },
      async ({ aquario }, ctx) => json(await d.faunaENinhadas(sbDe(ctx), aquario)),
    );
    server.registerTool(
      "fotos_recentes",
      { title: "Fotos recentes", description: "Fotos recentes com etiqueta, legenda e URL assinado (válido 60 minutos).", inputSchema: z.object({ aquario: aquarioArg, dias: diasArg(14) }), annotations: LEITURA },
      async ({ aquario, dias }, ctx) => json(await d.fotosRecentes(sbDe(ctx), aquario, dias)),
    );
    server.registerTool(
      "alertas_recentes",
      { title: "Alertas recentes", description: "Histórico de alertas enviados (TPA, produtos, ninhadas, férias, fontes externas).", inputSchema: z.object({ dias: diasArg(14) }), annotations: LEITURA },
      async ({ dias }, ctx) => json(await d.alertasRecentes(sbDe(ctx), dias)),
    );
    server.registerTool(
      "lista_desejos",
      { title: "Lista de desejos", description: "Itens que quero comprar (ou já comprados).", inputSchema: z.object({ estado: z.enum(["quero", "comprado"]).optional() }), annotations: LEITURA },
      async ({ estado }, ctx) => json(await d.listaDesejos(sbDe(ctx), estado)),
    );
    server.registerTool(
      "novidades_externas",
      { title: "Novidades externas", description: "Novidades detetadas em fontes externas: meteorologia, cortes de luz/água, qualidade da água, lojas.", inputSchema: z.object({ dias: diasArg(14) }), annotations: LEITURA },
      async ({ dias }, ctx) => json(await d.novidadesExternas(sbDe(ctx), dias)),
    );
    server.registerTool(
      "resumo_semanal",
      { title: "Resumo semanal", description: "Tudo da última semana num JSON compacto: estado atual, TPAs, medições, fauna, fotos, alertas, desejos e novidades externas.", annotations: LEITURA },
      async (ctx) => json(await d.resumoSemanal(sbDe(ctx))),
    );
  },
  {
    serverInfo: { name: "aquario", version: "1.0.0" },
    instructions:
      "Dados pessoais de aquários de água doce (Braga, Portugal). Só leitura. Datas em ISO 8601; dias em dias de calendário. Responde em português de Portugal.",
  },
);

// Valida o token OAuth emitido pelo Supabase Auth (e, opcionalmente, o email)
async function verificar(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return undefined;
  const permitidos = (process.env.MCP_EMAILS_PERMITIDOS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (permitidos.length && !permitidos.includes((data.user.email ?? "").toLowerCase())) return undefined;
  let clientId = "desconhecido";
  let expiresAt: number | undefined;
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    clientId = p.client_id ?? p.azp ?? clientId;
    expiresAt = p.exp;
  } catch {}
  return { token, clientId, scopes: [], expiresAt, extra: { userId: data.user.id } };
}

const autenticado = withMcpAuth(handler, verificar, { required: true });

export { autenticado as GET, autenticado as POST, autenticado as DELETE };
