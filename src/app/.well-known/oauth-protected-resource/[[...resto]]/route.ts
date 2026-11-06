// RFC 9728 — Protected Resource Metadata do servidor MCP (/api/mcp).
// Serve /.well-known/oauth-protected-resource e …/oauth-protected-resource/api/mcp
import { generateProtectedResourceMetadata, getPublicOrigin, metadataCorsOptionsRequestHandler } from "mcp-handler";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const origem = getPublicOrigin(req);
  const meta = generateProtectedResourceMetadata({
    authServerUrls: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
    resourceUrl: `${origem}/api/mcp`,
    additionalMetadata: { resource_name: "Aquário", bearer_methods_supported: ["header"] },
  });
  return Response.json(meta, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "max-age=3600" },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
