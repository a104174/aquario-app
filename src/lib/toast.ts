"use client";

import { createElement } from "react";
import { toast as sonner } from "sonner";
import { ToastPill } from "@/components/ui/toasts";
import { vibrar } from "./haptic";

export type AcaoToast = { texto: string; onClick: () => void };
export type TipoToast = "info" | "erro" | "ok";

/**
 * Mostra um toast (Sonner). A mesma mensagem não se repete: o id é o texto,
 * por isso um segundo toast igual atualiza o primeiro em vez de empilhar.
 */
export function toast(texto: string, tipo: TipoToast = "info", ms = 3200, acao?: AcaoToast) {
  if (tipo === "ok") vibrar("sucesso");
  if (tipo === "erro") vibrar("aviso");
  // o selo da pastilha já mostra o estado: tira "✓ "/"⚠︎ " do início do texto
  const limpo = texto.replace(/^(✓|⚠︎|⚠)\s*/u, "");
  sonner.custom((id) => createElement(ToastPill, { id, texto: limpo, tipo, acao }), { id: limpo, duration: ms });
}
