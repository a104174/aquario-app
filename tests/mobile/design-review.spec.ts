import { assentar, captura, test } from "./fixtures";

/**
 * Revisão de design (iPhone 16 Pro Max, 440×956): capturas de todos os ecrãs,
 * sheets e estados, em claro e escuro, e vídeos das interações principais.
 * CICLO=design-antes / design-depois → reviews/<data>/<ciclo>/iphone-16-pro-max
 */
test.beforeEach(({}, info) => test.skip(info.project.name !== "iphone-16-pro-max"));

const ECRAS: [string, string][] = [
  ["inicio", "/"],
  ["aquarios", "/aquarios"],
  ["detalhe", "/aquario?id=a1"],
  ["detalhe-sem-foto", "/aquario?id=a2"],
  ["historico", "/historico"],
  ["definicoes", "/definicoes"],
  ["alertas", "/alertas"],
  ["produtos", "/produtos"],
  ["desejos", "/desejos"],
  ["ferias", "/ferias"],
  ["fontes", "/fontes"],
];

for (const tema of ["light", "dark"] as const) {
  test.describe(`tema ${tema}`, () => {
    for (const [nome, url] of ECRAS) {
      test(`${nome} (${tema})`, async ({ app }, info) => {
        await app.emulateMedia({ colorScheme: tema });
        await app.goto(url);
        await assentar(app, 1100);
        await captura(app, info, `${nome}-${tema}`);
        await app.evaluate(() => document.querySelector(".scroll-area")?.scrollTo({ top: 900 }));
        await assentar(app, 500);
        await captura(app, info, `${nome}-${tema}-scroll`);
      });
    }
    for (const [nome, rotulo] of [["registar", ""], ["tpa", "TPA"], ["medicao", "Medição"], ["fauna", "Fauna"]] as const) {
      test(`sheet ${nome} (${tema})`, async ({ app }, info) => {
        await app.emulateMedia({ colorScheme: tema });
        await app.goto("/aquario?id=a1");
        await assentar(app);
        await app.getByRole("button", { name: "Registar", exact: true }).click();
        await assentar(app, 800);
        if (rotulo) {
          await app.getByRole("button", { name: new RegExp(`^${rotulo}`) }).click();
          await assentar(app, 800);
          await app.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        }
        await captura(app, info, `sheet-${nome}-${tema}`);
      });
    }
  });
}

test.describe("estados", () => {
  test.describe("vazio", () => {
    test.use({ cenario: "vazio" });
    for (const [nome, url] of [["inicio", "/"], ["aquarios", "/aquarios"], ["historico", "/historico"]] as const) {
      test(`${nome} vazio`, async ({ app }, info) => {
        await app.goto(url);
        await assentar(app, 1000);
        await captura(app, info, `${nome}-vazio`);
      });
    }
  });
  test.describe("erro", () => {
    test.use({ rede: "erro" });
    test("aquarios erro", async ({ app }, info) => {
      await app.goto("/aquarios");
      await assentar(app, 1500);
      await captura(app, info, "aquarios-erro");
    });
  });
});
