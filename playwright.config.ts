import { defineConfig, devices } from "@playwright/test";

// Testes de UX mobile: npm run test:mobile
// WebKit é prioritário (motor do iPhone); Chromium para Android (Pixel 7).
// O viewport é o ecrã inteiro: numa PWA instalada (standalone) não há barras do Safari.
const PORTA = 3200;

const iphone = (nome: string, width: number, height: number, safeTop: number, safeBottom: number) => ({
  name: nome,
  use: {
    ...devices["iPhone 15"],
    browserName: "webkit" as const,
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    safeTop,
    safeBottom,
  },
});

export default defineConfig({
  testDir: "tests/mobile",
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: 3,
  reporter: [["list"], ["json", { outputFile: "test-results/mobile.json" }]],
  globalTeardown: "./tests/mobile/contact-sheet.ts",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    serviceWorkers: "block",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    trace: "off",
  },
  projects: [
    iphone("iphone-15", 393, 852, 59, 34),
    iphone("iphone-se", 375, 667, 20, 0),
    iphone("iphone-15-pro-max", 430, 932, 59, 34),
    // iPhone 16 Pro Max (alvo principal): só os testes de teclado
    { ...iphone("iphone-16-pro-max", 440, 956, 62, 34), testMatch: /(teclado.*|design-review.*)\.spec\.ts/ },
    {
      name: "pixel-7",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium" as const,
        viewport: { width: 412, height: 915 },
        screen: { width: 412, height: 915 },
        deviceScaleFactor: 2,
        safeTop: 24,
        safeBottom: 0,
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORTA}`,
    port: PORTA,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
