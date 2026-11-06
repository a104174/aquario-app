"use client";

import { supabase } from "@/lib/supabase/client";

export type EstadoPush =
  | "sem-suporte" // browser sem Push API (no iOS: só com a app instalada, 16.4+)
  | "nao-instalada" // iOS no Safari: tem de ser instalada primeiro
  | "recusada" // permissão negada
  | "desligada" // pode ativar
  | "ligada"; // subscrito neste dispositivo

function eIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function eStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function estadoPush(): Promise<EstadoPush> {
  const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!suporta) return eIOS() && !eStandalone() ? "nao-instalada" : "sem-suporte";
  if (Notification.permission === "denied") return "recusada";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ligada" : "desligada";
}

function chaveVapid(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Tem de ser chamado a partir de um toque (gesto do utilizador) — exigência do iOS. */
export async function ativarPush() {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("permissao");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveVapid(vapid) }));
  const j = sub.toJSON();
  const { error } = await supabase()
    .from("push_subscricoes")
    .upsert(
      { endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function desativarPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase().from("push_subscricoes").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function enviarTeste() {
  const { data, error } = await supabase().functions.invoke<{ enviados: number }>("automacoes", {
    body: { teste: true },
  });
  if (error) throw error;
  return data?.enviados ?? 0;
}
