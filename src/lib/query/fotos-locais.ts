"use client";

// Fotos ainda por enviar ficam como Blob no IndexedDB até o upload
// terminar (sobrevivem a fechar a app offline).
import { createStore, del, get, set, clear } from "idb-keyval";

const store = typeof window !== "undefined" ? createStore("aquario-fotos", "pendentes") : undefined;

// Chaves: "<id>" para a foto e "<id>:thumb" para a miniatura.
export const chaveThumb = (id: string) => `${id}:thumb`;
export const guardarFotoPendente = (id: string, blob: Blob) => set(id, blob, store);
export const lerFotoPendente = (id: string) => get<Blob>(id, store);
export const apagarFotoPendente = async (id: string) => {
  await del(id, store);
  await del(chaveThumb(id), store);
};
export const limparFotosPendentes = () => clear(store);

/** URL canónico usado como chave na cache "fotos" do service worker. */
export function urlCacheFoto(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/fotos/${path}`;
}

/** Depois do upload, coloca a imagem na cache do SW: fica offline sem novo download. */
export async function semearCacheFoto(path: string, blob: Blob) {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open("fotos");
    await cache.put(
      urlCacheFoto(path),
      new Response(blob, { headers: { "Content-Type": blob.type || "image/jpeg" } }),
    );
  } catch {
    // sem Cache Storage (ex.: modo privado) — não é crítico
  }
}
