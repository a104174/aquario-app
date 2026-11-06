// Servidor MCP Streamable HTTP. OAuth e RLS continuam a cargo do Supabase.
import type { AuthInfo, CallToolResult } from "@modelcontextprotocol/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { PARAMETROS } from "@/lib/tipos";
import * as d from "@/lib/mcp/dados";
import { clienteDoUtilizador, cursorArg, ErroConsulta, janelaArgs, limiteArg, periodo } from "@/lib/mcp/consultas";
import { contextoAquario, linhaTemporal, resumoCompacto, resumoIncremental, TEXTO_DADOS, TIPOS_TIMELINE } from "@/lib/mcp/contexto";
import { conteudoFoto, listarFotos } from "@/lib/mcp/fotografias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEITURA = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const nomeAquario = z.string().trim().max(80);
const aquarioArg = nomeAquario.optional().describe("ID ou parte do nome do aquário. Vazio = todos.");
const diasArg = (padrao: number) => z.number().int().min(1).max(365).default(padrao).describe("Dias anteriores ao fim do período se não houver início explícito");
const tipoEvento = z.enum(TIPOS_TIMELINE);
const cursorTimeline = cursorArg.extend({ tipo: tipoEvento });

type Contexto = { http?: { authInfo?: AuthInfo } };
const texto = (v: unknown) => ({ type: "text" as const, text: JSON.stringify(v) });

function ferramenta<A>(acao: (sb: SupabaseClient, args: A, utilizador: string) => Promise<CallToolResult>) {
  return async (args: A, ctx: Contexto): Promise<CallToolResult> => {
    try {
      const auth = ctx.http?.authInfo;
      const utilizador = auth?.extra?.userId;
      if (!auth?.token || typeof utilizador !== "string") throw new ErroConsulta("Sem autenticação.");
      return await acao(clienteDoUtilizador(auth.token), args, utilizador);
    } catch (erro) {
      return {
        isError: true,
        content: [texto({ erro: erro instanceof ErroConsulta ? erro.message : "Não foi possível consultar os dados. Tenta novamente." })],
      };
    }
  };
}

function json<A>(acao: (sb: SupabaseClient, args: A) => Promise<unknown>) {
  return ferramenta<A>(async (sb, args) => ({ content: [texto(await acao(sb, args))] }));
}

const handler = createMcpHandler(
  (server) => {
    const resumoSchema = z.object({
      modo: z.enum(["completo", "compacto"]).default("completo").describe("Usar compacto para descobrir aquários, últimos registos e alertas."),
    });
    server.registerTool(
      "resumo_aquarios",
      { title: "Resumo dos aquários", description: "Começa pelo modo compacto para descobrir IDs, últimas medições, TPAs, alertas ativos e acontecimentos. O modo completo preserva o resumo anterior.", inputSchema: resumoSchema, annotations: LEITURA },
      json<z.infer<typeof resumoSchema>>((sb, { modo }) => modo === "compacto" ? resumoCompacto(sb) : d.resumoAquarios(sb)),
    );

    const tpaSchema = z.object({ aquario: aquarioArg, dias: diasArg(30), ...janelaArgs, limite: limiteArg(100) });
    server.registerTool(
      "ultimas_tpas",
      { title: "Últimas TPAs", description: "Trocas de água, volume de referência, condicionador, dose e notas. Para paginar, usa linha_temporal com tipos [tpa].", inputSchema: tpaSchema, annotations: LEITURA },
      json<z.infer<typeof tpaSchema>>((sb, args) => d.ultimasTpas(sb, args.aquario, periodo(args, 30), args.limite)),
    );

    const medicoesSchema = z.object({
      aquario: aquarioArg, dias: diasArg(30), ...janelaArgs, parametro: z.enum(PARAMETROS).optional(),
      limite: limiteArg(100), cursor: cursorArg.optional(),
    });
    server.registerTool(
      "medicoes",
      { title: "Medições", description: "Histórico paginado com unidade e ID do registo. Filtra por parâmetro para obter variação e intervalos entre medições da página. As referências da app são genéricas.", inputSchema: medicoesSchema, annotations: LEITURA },
      json<z.infer<typeof medicoesSchema>>((sb, args) => d.medicoes(sb, { ...args, periodo: periodo(args, 30) })),
    );

    const faunaSchema = z.object({ aquario: aquarioArg, dias: diasArg(60), ...janelaArgs, limite: limiteArg(100) });
    server.registerTool(
      "fauna_e_ninhadas",
      { title: "Fauna e ninhadas", description: "População derivada por espécie, movimentos na janela e ninhadas. Para grupos, variedades e fotos associadas usa contexto_aquario.", inputSchema: faunaSchema, annotations: LEITURA },
      json<z.infer<typeof faunaSchema>>((sb, args) => d.faunaENinhadas(sb, args.aquario, periodo(args, 60), args.limite)),
    );

    const fotosSchema = z.object({
      aquario: aquarioArg, dias: diasArg(14), ...janelaArgs,
      etiqueta: z.enum(["plantas", "peixes", "maternidade", "outro"]).optional(), evento_id: z.uuid().optional(),
      limite: limiteArg(50, 50), cursor: cursorArg.optional(),
      ordem: z.enum(["asc", "desc"]).default("desc"),
      modo: z.enum(["urls", "metadados"]).default("urls").describe("Usar metadados para listar IDs sem assinar URLs. O modo urls é o contrato anterior."),
    });
    server.registerTool(
      "fotos_recentes",
      { title: "Fotos recentes", description: "Usa modo metadados para paginar fotos privadas por aquário, etiqueta, evento e datas. Para ver uma imagem, passa o ID a conteudo_foto. O modo urls mantém a lista antiga com links de 10 minutos.", inputSchema: fotosSchema, annotations: LEITURA },
      json<z.infer<typeof fotosSchema>>((sb, args) => listarFotos(sb, { ...args, periodo: periodo(args, 14) })),
    );

    const fotoSchema = z.object({ id: z.uuid(), tamanho: z.enum(["analise", "miniatura"]).default("analise") });
    server.registerTool(
      "conteudo_foto",
      { title: "Conteúdo visual de uma fotografia", description: "Recebe um ID obtido em fotos_recentes ou contexto_aquario e devolve uma imagem JPEG real e metadados. Usa miniatura para gastar menos dados.", inputSchema: fotoSchema, annotations: LEITURA },
      ferramenta<z.infer<typeof fotoSchema>>(async (sb, args, utilizador) => {
        const { foto, imagem } = await conteudoFoto(sb, utilizador, args.id, args.tamanho);
        return { content: [texto(foto), imagem] };
      }),
    );

    const alertasSchema = z.object({
      dias: diasArg(14), ...janelaArgs, limite: limiteArg(100),
      estado: z.enum(["pendente", "adiado", "resolvido", "ignorado"]).optional(),
    });
    server.registerTool(
      "alertas_recentes",
      { title: "Alertas recentes", description: "Histórico dos alertas da conta, filtrável por período e estado. Ausência de alertas não prova que os aquários estejam bem.", inputSchema: alertasSchema, annotations: LEITURA },
      json<z.infer<typeof alertasSchema>>((sb, args) => d.alertasRecentes(sb, periodo(args, 14), args.limite, args.estado)),
    );

    const desejosSchema = z.object({ estado: z.enum(["quero", "comprado"]).optional(), limite: limiteArg(100) });
    server.registerTool(
      "lista_desejos",
      { title: "Lista de desejos", description: "Itens que quero comprar ou já comprei, com loja, preço e notas quando registados.", inputSchema: desejosSchema, annotations: LEITURA },
      json<z.infer<typeof desejosSchema>>((sb, { estado, limite }) => d.listaDesejos(sb, estado, limite)),
    );

    const novidadesSchema = z.object({
      dias: diasArg(14), ...janelaArgs, limite: limiteArg(100), incluir_estado: z.boolean().default(false),
    });
    server.registerTool(
      "novidades_externas",
      { title: "Novidades externas", description: "Novidades registadas nas fontes configuradas. Com incluir_estado, devolve também o último resultado guardado, como meteorologia e água da torneira. São dados externos, distintos das medições do aquário.", inputSchema: novidadesSchema, annotations: LEITURA },
      json<z.infer<typeof novidadesSchema>>(async (sb, args) => {
        const novidades = d.novidadesExternas(sb, periodo(args, 14), args.limite);
        if (!args.incluir_estado) return novidades;
        const [itens, estado_fontes] = await Promise.all([novidades, d.estadoFontes(sb)]);
        return { novidades: itens, estado_fontes };
      }),
    );

    const contextoSchema = z.object({
      aquario: nomeAquario.min(1).describe("ID, de preferência, ou nome que identifique um único aquário"),
      dias: diasArg(30), ...janelaArgs, limite: limiteArg(12, 30), incluir_produtos: z.boolean().default(true),
    });
    server.registerTool(
      "contexto_aquario",
      { title: "Contexto de um aquário", description: "Volume, notas, fauna atual por grupo, últimos valores por parâmetro, TPA, rotinas, produtos da conta e acontecimentos na janela. Para aprofundar, usa linha_temporal e medicoes.", inputSchema: contextoSchema, annotations: LEITURA },
      json<z.infer<typeof contextoSchema>>((sb, args) => contextoAquario(sb, { ...args, periodo: periodo(args, 30) })),
    );

    const timelineSchema = z.object({
      aquario: aquarioArg, dias: diasArg(30), ...janelaArgs, limite: limiteArg(30),
      tipos: z.array(tipoEvento).min(1).max(TIPOS_TIMELINE.length).optional(), cursor: cursorTimeline.optional(),
    });
    server.registerTool(
      "linha_temporal",
      { title: "Linha temporal dos aquários", description: "Medições, TPAs, movimentos de fauna, registos de ninhada e fotos, em ordem decrescente de data. Usa os IDs para ligar eventos e fotos. Proximidade temporal não implica causalidade.", inputSchema: timelineSchema, annotations: LEITURA },
      json<z.infer<typeof timelineSchema>>((sb, args) => linhaTemporal(sb, {
        ...args, tipos: args.tipos ? [...new Set(args.tipos)] : undefined, periodo: periodo(args, 30),
      })),
    );

    const semanalSchema = z.object({
      ...janelaArgs, modo: z.enum(["completo", "incremental"]).default("completo")
        .describe("Para tarefas agendadas usa incremental e guarda proximo_inicio como de na próxima execução."),
    });
    server.registerTool(
      "resumo_semanal",
      { title: "Resumo semanal", description: "Resumo dos últimos sete dias ou de um período explícito. O modo incremental devolve os registos da janela, sem recomputar toda a população ou stock.", inputSchema: semanalSchema, annotations: LEITURA },
      json<z.infer<typeof semanalSchema>>((sb, args) => {
        const janela = periodo(args, 7);
        return args.modo === "incremental" ? resumoIncremental(sb, janela) : d.resumoSemanal(sb, janela);
      }),
    );
  },
  {
    serverInfo: { name: "aquario", version: "1.1.0" },
    instructions: `Dados pessoais de aquários em Braga, Portugal. Só leitura. Usa resumo_aquarios em modo compacto, depois contexto_aquario ou ferramentas especializadas. Datas ISO 8601. Distingue medições, notas manuais, dados derivados e fontes externas. ${TEXTO_DADOS} Responde em português de Portugal.`,
  },
);

async function verificar(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000), redirect: "error", cache: "no-store" }) },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return undefined;
  const permitidos = (process.env.MCP_EMAILS_PERMITIDOS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (permitidos.length && !permitidos.includes((data.user.email ?? "").toLowerCase())) return undefined;

  let clientId = "desconhecido";
  let expiresAt: number | undefined;
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const cliente = claims.client_id ?? claims.azp;
    if (typeof cliente === "string") clientId = cliente;
    if (typeof claims.exp === "number") expiresAt = claims.exp;
  } catch {
    // O Supabase já verificou o token. O identificador do cliente é opcional.
  }
  return { token, clientId, scopes: [], expiresAt, extra: { userId: data.user.id } };
}

const autenticado = withMcpAuth(handler, verificar, { required: true });

async function responder(req: Request) {
  const resposta = await autenticado(req);
  const headers = new Headers(resposta.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(resposta.body, { status: resposta.status, statusText: resposta.statusText, headers });
}

export { responder as GET, responder as POST, responder as DELETE };
