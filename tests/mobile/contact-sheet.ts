// Global teardown: gera uma contact sheet (grelha de capturas) por dispositivo,
// usando o próprio Playwright para renderizar uma página HTML com as imagens.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pastaReview } from "./fixtures";

export default async function contactSheet() {
  const base = pastaReview();
  if (!fs.existsSync(base)) return;
  const browser = await chromium.launch();
  try {
    for (const proj of fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory())) {
      const pasta = path.join(base, proj);
      const imgs = fs.readdirSync(pasta).filter((f) => f.endsWith(".jpg")).sort();
      if (!imgs.length) continue;
      const html = `<html><body style="margin:0;background:#1d1d1f;font:12px system-ui;color:#ddd">
        <h1 style="font-size:16px;margin:12px">${proj} · ${imgs.length} capturas · ${path.basename(base)}</h1>
        <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;padding:10px">
        ${imgs.map((f) => `<figure style="margin:0"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(pasta, f)).toString("base64")}" style="width:100%;border-radius:10px;display:block"><figcaption style="padding:4px 2px">${f.replace(".jpg", "")}</figcaption></figure>`).join("")}
        </div></body></html>`;
      const page = await browser.newPage({ viewport: { width: 2000, height: 1000 } });
      await page.setContent(html, { waitUntil: "load" });
      await page.screenshot({ path: path.join(base, `contact-sheet-${proj}.jpg`), fullPage: true, type: "jpeg", quality: 60 });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
