// Supabase simulado (HTTP local) com os dados das fixtures dos testes.
// Usado pelo Lighthouse (npm run lighthouse). Porta: MOCK_PORT (3300).
// Corre com: node --experimental-strip-types scripts/mock-supabase.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { criarDados } from "../tests/mobile/dados.ts";

const PORTA = Number(process.env.MOCK_PORT ?? 3300);
const db = criarDados("cheio");
const ASSETS = path.join(import.meta.dirname, "..", "tests", "mobile", "assets");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS,HEAD",
  "Access-Control-Expose-Headers": "Content-Range",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORTA}`);
    const p = url.pathname;
    const json = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify(body));
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors), res.end();
    if (p.startsWith("/auth/v1/")) return json(200, { id: "u1", email: "eu@exemplo.pt" });
    if (p.startsWith("/storage/v1/object/sign/")) {
      if (req.method === "POST") return json(200, { signedURL: p.replace("/storage/v1", "") + "?token=t" });
      res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "max-age=3600", ...cors });
      return res.end(fs.readFileSync(path.join(ASSETS, `fixture${(p.length % 3) + 1}.jpg`)));
    }
    const tabela = p.split("/rest/v1/")[1];
    if (tabela) {
      const linhas = db[tabela] ?? [];
      const objeto = (req.headers.accept ?? "").includes("vnd.pgrst.object");
      return json(200, req.method === "GET" ? (objeto ? (linhas[0] ?? null) : linhas) : []);
    }
    json(200, {});
  })
  .listen(PORTA, () => console.log(`mock supabase em http://localhost:${PORTA}`));
