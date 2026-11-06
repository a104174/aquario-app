"use client";

import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState, type ReactNode } from "react";
import { iniciarEnterAvanca, iniciarTeclado, iniciarTocarFora } from "@/lib/teclado";
import { SessionProvider } from "@/lib/auth/session";
import { criarQueryClient } from "@/lib/query/dados";
import { CACHE_BUSTER, CACHE_MAX_AGE, persister } from "@/lib/query/persistencia";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(criarQueryClient);

  useEffect(() => {
    iniciarTeclado();
    iniciarTocarFora();
    iniciarEnterAvanca();
    // Service worker: registo tolerante (em modo privado, ou se falhar, a app
    // continua a funcionar sem erros na consola)
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/serwist/sw.js", { scope: "/", type: "module" }).catch(() => {});
    }
  }, []);

  return (
      <PersistQueryClientProvider
        client={qc}
        persistOptions={{
          persister,
          buster: CACHE_BUSTER,
          maxAge: CACHE_MAX_AGE,
          dehydrateOptions: {
            // object URLs (blob:) não sobrevivem a recarregar a app
            shouldDehydrateQuery: (q) =>
              defaultShouldDehydrateQuery(q) && !(typeof q.state.data === "string" && q.state.data.startsWith("blob:")),
          },
        }}
        onSuccess={() => {
          // Cache restaurada: retomar o que ficou por sincronizar offline
          void qc.resumePausedMutations().then(() => qc.invalidateQueries());
        }}
      >
        <SessionProvider>{children}</SessionProvider>
      </PersistQueryClientProvider>
  );
}
