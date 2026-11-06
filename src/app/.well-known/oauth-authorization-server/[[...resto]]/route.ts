// Compatibilidade com clientes MCP mais antigos que procuram os metadados do
// servidor de autorização na origem do recurso: devolve os do Supabase Auth.
import { metadataCorsOptionsRequestHandler } from "mcp-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`, {
    next: { revalidate: 3600 },
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
