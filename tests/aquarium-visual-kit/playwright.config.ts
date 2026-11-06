import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "../../test-results/aquarium-visual-kit",
  use: { locale: "pt-PT", timezoneId: "Europe/Lisbon" },
  projects: [
    { name: "dados", testMatch: "dados.spec.ts" },
    {
      name: "webkit",
      testMatch: "visual.spec.ts",
      use: { ...devices["iPhone 16 Pro Max"], viewport: { width: 440, height: 956 } },
    },
    { name: "chromium", testMatch: "visual.spec.ts", use: { ...devices["Pixel 7"] } },
  ],
});
