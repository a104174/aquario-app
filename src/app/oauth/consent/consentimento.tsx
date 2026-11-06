"use client";

// Ecrã de consentimento do servidor OAuth 2.1 da Supabase.
// O claude.ai (conector MCP) redireciona para aqui com ?authorization_id=…
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/session";
import { supabase } from "@/lib/supabase/client";

type Detalhes = { cliente: string; uri: string; email: string; scope: string };

export function Consentimento() {
  const id = useSearchParams().get("authorization_id") ?? "";
  const { session, pronto } = useSession();
  const router = useRouter();
  const [det, setDet] = useState<Detalhes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    if (!pronto) return;
    if (!session) {
      router.replace(`/login?voltar=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`);
      return;
    }
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErro("Pedido de autorização inválido.");
      return;
    }
    supabase()
      .then((sb) => sb.auth.oauth.getAuthorizationDetails(id))
      .then(({ data, error }) => {
        if (error || !data) return setErro("Este pedido expirou ou já foi usado. Volta a ligar o conector.");
        if ("redirect_url" in data && !("authorization_id" in data)) {
          window.location.href = data.redirect_url as string;
          return;
        }
        const d = data as { client: { name?: string; client_name?: string; uri?: string }; redirect_uri: string; user: { email: string }; scope: string };
        setDet({
          cliente: d.client.name ?? d.client.client_name ?? "Aplicação",
          uri: (() => {
            try {
              return new URL(d.redirect_uri).host;
            } catch {
              return d.redirect_uri;
            }
          })(),
          email: d.user.email,
          scope: d.scope,
        });
      });
  }, [pronto, session, id, router]);

  async function decidir(aprovar: boolean) {
    setAEnviar(true);
    const r = aprovar
      ? await (await supabase()).auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
      : await (await supabase()).auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
    if (r.error || !r.data) {
      setAEnviar(false);
      return setErro("Não foi possível concluir. Tenta outra vez.");
    }
    window.location.href = r.data.redirect_url;
  }

  return (
    <div className="altura-app flex flex-col">
      <div className="header-ambient flex flex-1 flex-col items-center justify-end px-6 pb-8 pt-[calc(var(--safe-top)+24px)] text-center text-white">
        <h1 className="text-[28px] font-bold">Autorizar acesso</h1>
        <p className="mt-1 text-white/70">Aquário · leitura dos teus dados</p>
      </div>
      <div className="bg-bg px-5 pb-[calc(var(--safe-bottom)+24px)] pt-6">
        {erro ? (
          <p className="rounded-[14px] bg-danger-soft px-4 py-3 text-danger">{erro}</p>
        ) : !det ? (
          <div className="space-y-2">
            <div className="skeleton h-6 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        ) : (
          <div className="enter-up">
            <p className="text-[17px]">
              <span className="font-semibold">{det.cliente}</span> ({det.uri}) quer ler os dados dos teus aquários: TPAs, medições, fauna, fotos, alertas e lista de desejos.
            </p>
            <p className="mt-2 text-[14px] text-text-2">Só leitura. Conta: {det.email}. Podes revogar a qualquer momento.</p>
            <div className="mt-5 space-y-2">
              <Button block onClick={() => decidir(true)} loading={aEnviar}>
                Autorizar
              </Button>
              <Button block variant="secondary" onClick={() => decidir(false)} disabled={aEnviar}>
                Recusar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
