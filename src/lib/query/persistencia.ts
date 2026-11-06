"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createStore, del, get, set } from "idb-keyval";

const store = typeof window !== "undefined" ? createStore("aquario-cache", "query") : undefined;

/** Persister do TanStack Query em IndexedDB (via idb-keyval). */
export const persister = createAsyncStoragePersister({
  key: "aquario-query-cache",
  throttleTime: 800,
  storage:
    typeof window === "undefined"
      ? undefined
      : {
          getItem: (k: string) => get<string>(k, store).then((v) => v ?? null),
          setItem: (k: string, v: string) => set(k, v, store),
          removeItem: (k: string) => del(k, store),
        },
});

// Mudar quando o formato dos dados em cache mudar (invalida a cache local).
export const CACHE_BUSTER = "v3";
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 dias
