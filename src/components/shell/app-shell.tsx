"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ActionSheetHost } from "@/components/ui/action-sheet";
import { Toasts } from "@/components/ui/toasts";
import { VisualizadorHost } from "@/components/fotos/visualizador";
import { RegistarSheet } from "@/components/registar/registar-sheet";
import { useSession } from "@/lib/auth/session";
import { TabBar } from "./tab-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const { session, pronto } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (pronto && !session) router.replace("/login");
  }, [pronto, session, router]);

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
      <RegistarSheet />
      <VisualizadorHost />
      <ActionSheetHost />
      <Toasts />
    </>
  );
}
