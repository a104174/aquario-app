"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { subscreverEscolha, ultimoPedido } from "@/components/ui/action-sheet";
import { Toasts } from "@/components/ui/toasts";
import { useSession } from "@/lib/auth/session";
import { useUI } from "@/lib/ui-store";
import { useVisualizador } from "@/lib/visualizador-store";
import { TabBar } from "./tab-bar";

// Fora do bundle inicial: só são precisos depois de um toque
const RegistarSheet = dynamic(() => import("@/components/registar/registar-sheet").then((m) => m.RegistarSheet), { ssr: false });
const VisualizadorHost = dynamic(() => import("@/components/fotos/visualizador").then((m) => m.VisualizadorHost), { ssr: false });
const ActionSheetHost = dynamic(() => import("@/components/ui/action-sheet-host").then((m) => m.ActionSheetHost), { ssr: false });

export function AppShell({ children }: { children: ReactNode }) {
  const { session, pronto } = useSession();
  const registarUsado = useUsadoUmaVez(useUI((e) => e.registar.aberto));
  const visualizadorUsado = useUsadoUmaVez(useVisualizador() !== null);
  const actionSheetUsada = useSyncExternalStore(subscreverEscolha, () => ultimoPedido() !== null, () => false);
  const router = useRouter();

  useEffect(() => {
    if (pronto && !session) router.replace("/login");
  }, [pronto, session, router]);

  useEffect(() => {
    // Primeiro toque no ecrã → pré-carrega as sheets (vaul) enquanto o dedo
    // ainda está a descer: a 1.ª sheet abre sem o custo de carregar o código.
    const preCarregar = () => {
      void import("@/components/ui/sheet-impl");
      void import("@/components/registar/registar-sheet");
    };
    window.addEventListener("pointerdown", preCarregar, { once: true, passive: true, capture: true });
    return () => window.removeEventListener("pointerdown", preCarregar, { capture: true });
  }, []);

  useEffect(() => {
    // Sem View Transitions API → fallback em CSS (.screen-enter + data-nav)
    if (typeof document.startViewTransition !== "function") document.documentElement.classList.add("no-vt");
  }, []);

  return (
    <>
      {/* Envolve a app para o vaul escalar o fundo quando abre uma sheet */}
      <div data-vaul-drawer-wrapper="" className="altura-app overflow-hidden bg-bg">
        {children}
        <TabBar />
      </div>
      {/* montados só na primeira utilização (o código chega no 1.º toque) */}
      {registarUsado && <RegistarSheet />}
      {visualizadorUsado && <VisualizadorHost />}
      {actionSheetUsada && <ActionSheetHost />}
      <Toasts />
    </>
  );
}

/** true a partir da primeira vez que `agora` foi true. */
function useUsadoUmaVez(agora: boolean) {
  const [usado, setUsado] = useState(agora);
  if (agora && !usado) setUsado(true);
  return usado;
}
