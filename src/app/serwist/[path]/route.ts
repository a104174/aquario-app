// Serve o service worker em /serwist/sw.js (Serwist + Turbopack).
// O Next 16 compila com Turbopack, que ainda não suporta plugins de
// webpack, por isso o SW é gerado por um Route Handler estático.
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

// Ecrãs pré-cacheados: a app arranca a partir da cache mesmo offline.
const ROTAS = ["/", "/aquario", "/historico", "/definicoes", "/login", "/alertas", "/produtos", "/desejos", "/ferias", "/fontes"];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: ROTAS.map((url) => ({ url, revision })),
  // As splash screens só são lidas pelo iOS ao instalar; não pré-cachear.
  globIgnores: ["public/splash/**/*"],
});
