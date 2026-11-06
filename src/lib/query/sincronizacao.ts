"use client";

import { onlineManager, useMutationState } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** Número de alterações ainda por enviar ao servidor. */
export function usePendentes() {
  return useMutationState({ filters: { status: "pending" } }).length;
}

export function useOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
