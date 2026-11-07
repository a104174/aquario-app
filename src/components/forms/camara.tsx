"use client";

import { useEffect, useState, type RefObject } from "react";
import { IconCamara } from "@/components/icons";
import { Button } from "@/components/ui/button";

const CHAVE = "aquario-camara-explicada";

type Painel = null | "explicar" | "recusada";

function lerExplicada() {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

/**
 * Câmara com explicação ANTES do pedido do sistema (o iOS só pergunta uma
 * vez; se a pessoa recusar sem contexto, a câmara fica bloqueada) e um
 * painel útil quando o acesso foi recusado.
 *
 * O estado da permissão é lido antes do toque: `abrir()` tem de ser síncrono
 * para o clique no <input type=file> continuar a contar como gesto.
 */
export function useCamara(camaraRef: RefObject<HTMLInputElement | null>) {
  const [painel, setPainel] = useState<Painel>(null);
  const [permissao, setPermissao] = useState<PermissionState | null>(null);

  useEffect(() => {
    let vivo = true;
    let status: PermissionStatus | null = null;
    const atualizar = () => vivo && status && setPermissao(status.state);
    navigator.permissions
      ?.query({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        atualizar();
        s.addEventListener("change", atualizar);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      status?.removeEventListener("change", atualizar);
    };
  }, []);

  function abrir() {
    if (permissao === "denied") return setPainel("recusada");
    if (permissao !== "granted" && !lerExplicada()) return setPainel("explicar");
    setPainel(null);
    camaraRef.current?.click();
  }

  function continuar() {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {}
    setPainel(null);
    camaraRef.current?.click();
  }

  return { abrir, continuar, painel, fechar: () => setPainel(null) };
}

export function PainelCamara({
  painel,
  onContinuar,
  onFechar,
  onGaleria,
}: {
  painel: Painel;
  onContinuar: () => void;
  onFechar: () => void;
  onGaleria: () => void;
}) {
  if (!painel) return null;
  const recusada = painel === "recusada";
  return (
    <div role="region" aria-label="Acesso à câmara" className="pop-in mb-4 rounded-[14px] bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-forte">
          <IconCamara size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{recusada ? "A câmara está bloqueada" : "Acesso à câmara"}</p>
          {recusada ? (
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-subhead text-text-2">
              <li>Abre as Definições do iPhone</li>
              <li>Toca em Aquário (ou Safari)</li>
              <li>Em Câmara, escolhe Permitir</li>
            </ol>
          ) : (
            <p className="mt-0.5 text-subhead text-text-2">
              Para tirares fotos dos aquários, o iPhone vai pedir acesso à câmara — só desta vez. As fotos ficam apenas na tua conta.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" className="h-11 text-subhead" onClick={recusada ? onGaleria : onFechar}>
          {recusada ? "Usar a galeria" : "Agora não"}
        </Button>
        <Button type="button" className="h-11 text-subhead" onClick={recusada ? onFechar : onContinuar}>
          {recusada ? "OK" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
