import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: ["tests/integration/aws/**/*.test.ts"],
    hookTimeout: 30_000,
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@tests": new URL("./tests", import.meta.url).pathname,
    },
  },
});
