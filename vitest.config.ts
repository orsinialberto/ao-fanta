import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./vitest.globalSetup.ts",
    // Keep in sync with TEST_DATABASE_URL in vitest.globalSetup.ts.
    env: { DATABASE_URL: "file:./test.db" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
