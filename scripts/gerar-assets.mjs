// Gera ícones (incl. maskable e apple-touch-icon) e splash screens iOS
// com o pwa-asset-generator, e escreve src/app/splash-screens.ts para o
// layout declarar os <link rel="apple-touch-startup-image">.
//
// Uso: npm run assets
import { generateImages } from "pwa-asset-generator";
import { writeFile, mkdir, rm } from "node:fs/promises";

const CORES = {
  claro: "#eef3f6", // --bg modo claro
  escuro: "#071219", // --bg modo escuro
  icone: "#05141d",
};

const comum = {
  log: false,
  noSandbox: true,
  type: "png",
  opaque: true,
};

async function main() {
  await rm("public/splash", { recursive: true, force: true });
  await mkdir("public/splash", { recursive: true });
  await mkdir("public/icons", { recursive: true });

  // 1) Ícones: o SVG já tem fundo full-bleed e o desenho dentro da zona segura
  //    de 60%, por isso serve para "any" e "maskable" sem padding.
  await generateImages("assets/icon.svg", "public/icons", {
    ...comum,
    iconOnly: true,
    favicon: true,
    padding: "0",
    background: CORES.icone,
    pathOverride: "/icons",
  });

  // 2) Splash screens iOS (só retrato), uma versão para cada modo.
  const metas = [];
  for (const [modo, cor] of [
    ["claro", CORES.claro],
    ["escuro", CORES.escuro],
  ]) {
    const out = `public/splash/${modo}`;
    const { htmlMeta } = await generateImages("assets/splash.svg", out, {
      ...comum,
      splashOnly: true,
      portraitOnly: true,
      darkMode: modo === "escuro",
      background: cor,
      padding: "calc(50vh - 60px) calc(50vw - 90px)",
      pathOverride: `/splash/${modo}`,
    });
    const tags = htmlMeta.appleLaunchImage ?? htmlMeta.appleLaunchImageDarkMode ?? "";
    for (const m of tags.matchAll(/href="([^"]+)"\s+media="([^"]+)"/g)) {
      // a versão clara também declara o esquema, para o iOS não escolher a
      // splash errada quando ambas fazem match.
      const media = modo === "claro" ? `(prefers-color-scheme: light) and ${m[2]}` : m[2];
      metas.push({ url: m[1], media });
    }
  }

  const ts = `// Gerado por scripts/gerar-assets.mjs — não editar à mão.
export const splashScreens: { url: string; media: string }[] = ${JSON.stringify(metas, null, 2)};
`;
  await writeFile("src/app/splash-screens.ts", ts);
  console.log(`✓ ícones em public/icons, ${metas.length} splash screens em public/splash`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
