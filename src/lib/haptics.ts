"use client";

type Intensidade = "leve" | "sucesso" | "atencao";

let interruptor: HTMLInputElement | null = null;

/**
 * Tenta usar o controlo switch nativo do WebKit, que produz feedback tátil
 * em versões recentes do iOS. Noutros browsers usa Vibration API quando
 * estiver disponível. É sempre um extra: nenhuma ação depende do haptic.
 */
export function feedbackTatil(intensidade: Intensidade = "leve") {
  if (typeof document === "undefined") return;

  try {
    if (!interruptor) {
      interruptor = document.createElement("input");
      interruptor.type = "checkbox";
      interruptor.setAttribute("switch", "");
      interruptor.setAttribute("aria-hidden", "true");
      interruptor.tabIndex = -1;
      Object.assign(interruptor.style, {
        position: "fixed",
        width: "1px",
        height: "1px",
        opacity: "0",
        pointerEvents: "none",
        left: "-10px",
        bottom: "-10px",
      });
      document.body.appendChild(interruptor);
    }
    interruptor.click();
  } catch {
    // O feedback é opcional e não deve interromper a ação principal.
  }

  if ("vibrate" in navigator) {
    const padrao = intensidade === "sucesso" ? [12, 35, 18] : intensidade === "atencao" ? [24] : [10];
    navigator.vibrate(padrao);
  }
}
