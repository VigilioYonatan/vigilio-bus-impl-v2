import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@tests": new URL("./tests", import.meta.url).pathname,
    },
  },
  test: {
    fileParallelism: false,
    globals: true,
    hookTimeout: 45_000,
    include: ["tests/integration/aws/**/*.test.ts"],
    testTimeout: 45_000,
  },
});
