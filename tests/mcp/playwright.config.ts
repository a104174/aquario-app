import { defineConfig } from "@playwright/test";

export default defineConfig({ testDir: ".", outputDir: "../../test-results/mcp", workers: 1 });
