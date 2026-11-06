/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // /aquario?id=… usa o mesmo HTML pré-cacheado de /aquario
    ignoreURLParametersMatching: [/.*/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Fotos do Supabase Storage: URLs assinados mudam o token a cada
    // pedido, por isso a chave da cache ignora a query string.
    {
      matcher: ({ url }) => url.pathname.includes("/storage/v1/object/") && url.pathname.includes("/fotos/"),
      handler: new CacheFirst({
        cacheName: "fotos",
        plugins: [
          new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 365 * 24 * 60 * 60 }),
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              const url = new URL(request.url);
              url.search = "";
              url.pathname = url.pathname.replace("/object/sign/", "/object/");
              return url.href;
            },
          },
        ],
      }),
    },
    // API do Supabase (REST, auth, functions, uploads): nunca cachear no SW.
    // Os dados já vivem no IndexedDB (TanStack Query) e são privados.
    {
      matcher: ({ url, sameOrigin }) => !sameOrigin && /\/(rest|auth|functions|storage)\/v1\//.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// ------------------------------------------------------------------
// Web Push — lembretes de TPA
// ------------------------------------------------------------------
type PushPayload = { title?: string; body?: string; url?: string; tag?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title ?? "Aquário";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? "",
      icon: "/icons/manifest-icon-192.maskable.png",
      badge: "/icons/favicon-196.png",
      tag: data.tag ?? "lembrete-tpa",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const j of janelas) {
        if ("focus" in j) {
          await j.focus();
          if ("navigate" in j) await (j as WindowClient).navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
