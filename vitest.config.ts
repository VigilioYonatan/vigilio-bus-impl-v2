import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/**/application/service/**/*.ts",
        "src/**/application/security/**/*.ts",
        "src/shared/infrastructure/security/**/*.ts",
        "src/shared/infrastructure/config/environment.schema.ts",
        "src/shared/infrastructure/database/database-url.resolver.ts",
        "src/health/application/service/**/*.ts",
        "src/ai-chat/infrastructure/bedrock/**/*.ts",
        "src/upload/infrastructure/s3/**/*.ts",
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@tests": new URL("./tests", import.meta.url).pathname,
    },
  },
});
