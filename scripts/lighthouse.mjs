// Lighthouse (mobile) nos ecrãs principais, com sessão e dados simulados.
// Uso: npm run lighthouse   → relatórios em reviews/AAAA-MM-DD/<CICLO>/lighthouse/
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const APP = 3200;
const MOCK = 3300;
const dia = new Date().toISOString().slice(0, 10);
const saida = path.join("reviews", dia, process.env.CICLO ?? "ciclo-0", "lighthouse");
fs.mkdirSync(saida, { recursive: true });
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${MOCK}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "teste" };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.SEM_BUILD !== "1") execFileSync("npx", ["next", "build"], { env, stdio: "ignore" });
const mock = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/mock-supabase.mjs"], { env: { ...env, MOCK_PORT: String(MOCK) }, stdio: "ignore" });
const app = spawn("npx", ["next", "start", "-p", String(APP)], { env, stdio: "ignore" });
await esperar(4000);

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "lh-"));
const ctx = await chromium.launchPersistentContext(perfil, { headless: true });
const p = await ctx.newPage();
await p.goto(`http://localhost:${APP}/login`);
await p.evaluate(() =>
  localStorage.setItem("aquario-auth", JSON.stringify({ access_token: "t", refresh_token: "r", expires_at: 9999999999, expires_in: 3600, token_type: "bearer", user: { id: "u1", email: "eu@exemplo.pt" } })),
);
await ctx.close();

const paginas = { aquarios: "/", detalhe: "/aquario?id=a1", historico: "/historico", definicoes: "/definicoes" };
const notas = {};
// Mediana de N corridas por ecrã (recomendação do Lighthouse: uma corrida
// isolada varia vários pontos com a carga da máquina).
const CORRIDAS = Number(process.env.LH_CORRIDAS ?? 3);
try {
  for (const [nome, rota] of Object.entries(paginas)) {
    const corridas = [];
    for (let n = 0; n < CORRIDAS; n++) {
      const base = path.join(saida, CORRIDAS > 1 ? `${nome}-${n + 1}` : nome);
      execFileSync(
        "npx",
        [
          "--yes", "lighthouse@13.6.0", `http://localhost:${APP}${rota}`,
          "--form-factor=mobile", "--disable-storage-reset", "--quiet",
          "--only-categories=performance,accessibility,best-practices,seo",
          `--chrome-flags=--headless=new --no-sandbox --user-data-dir=${perfil}`,
          "--output=json", "--output=html", `--output-path=${base}`,
        ],
        { env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium" }, stdio: "ignore" },
      );
      corridas.push({ base, r: JSON.parse(fs.readFileSync(`${base}.report.json`, "utf8")) });
    }
    // corrida mediana pelo desempenho (as outras categorias são estáveis)
    corridas.sort((a, b) => a.r.categories.performance.score - b.r.categories.performance.score);
    const { base, r } = corridas[Math.floor(corridas.length / 2)];
    for (const c of corridas) if (c.base !== base) for (const ext of ["json", "html"]) fs.rmSync(`${c.base}.report.${ext}`, { force: true });
    if (base !== path.join(saida, nome)) for (const ext of ["json", "html"]) fs.renameSync(`${base}.report.${ext}`, path.join(saida, `${nome}.report.${ext}`));
    notas[nome] = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    notas[nome].corridas = corridas.map((c) => Math.round(c.r.categories.performance.score * 100));
    notas[nome].falhas = Object.values(r.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode === "binary" || (a.score !== null && a.score < 0.5 && a.scoreDisplayMode === "numeric"))
      .map((a) => a.id);
    notas[nome].metricas = { FCP: r.audits["first-contentful-paint"].displayValue, LCP: r.audits["largest-contentful-paint"].displayValue, TBT: r.audits["total-blocking-time"].displayValue, CLS: r.audits["cumulative-layout-shift"].displayValue };
  }
} finally {
  app.kill();
  mock.kill();
  spawn("bash", ["-c", `fuser -k ${APP}/tcp ${MOCK}/tcp 2>/dev/null`]);
}
fs.writeFileSync(path.join(saida, "resumo.json"), JSON.stringify(notas, null, 2));
console.log(JSON.stringify(notas, null, 2));
