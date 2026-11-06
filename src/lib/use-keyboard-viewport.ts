"use client";

import { useSyncExternalStore } from "react";
import { estadoTeclado, subscreverTeclado, type EstadoTeclado } from "./teclado";

const FECHADO: EstadoTeclado = { vvh: 0, topo: 0, kb: 0, aberto: false };

/**
 * Estado do teclado virtual (visualViewport) para componentes React:
 * altura visível, topo da zona visível, altura do teclado e aberto/fechado.
 * O motor é único (lib/teclado, iniciado no Providers) e também publica
 * --vvh, --vv-topo, --vv-fundo e --kb-height para o CSS.
 */
export function useKeyboardViewport(): EstadoTeclado {
  return useSyncExternalStore(subscreverTeclado, estadoTeclado, () => FECHADO);
}
