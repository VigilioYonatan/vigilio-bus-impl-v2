import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);

function localPostgresUrl(database: string): string {
  const url = new URL("postgres://127.0.0.1:5432");
  url.username = "postgres";
  url.password = "postgres";
  url.pathname = database;
  return url.toString();
}

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  timeout: 30_000,
  // Todos los proyectos E2E comparten la base `bus_impl_e2e`; un solo worker
  // evita carreras de seed/cleanup en ejecuciones locales y CI.
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "reports/playwright-e2e.xml" }],
  ],
  projects: [
    {
      name: "api",
      testMatch: ["**/*.api.spec.ts"],
    },
    {
      name: "browser",
      testMatch: ["**/*.browser.spec.ts"],
    },
  ],
  webServer: {
    command: "vigilio-node setup-e2e-db && tsx scripts/seed-local-db.ts && tsx src/main.ts",
    url: "http://127.0.0.1:3000/ready",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      APP_STAGE: "local",
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? localPostgresUrl("bus_impl_e2e"),
      GOOGLE_CLIENT_ID:
        process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id.apps.googleusercontent.com",
      JWT_SECRET: process.env.JWT_SECRET ?? "local-e2e-secret-change-me-please-32-chars",
      NODE_ENV: "test",
      PORT: "3000",
      AWS_ACCESS_KEY_ID: "test",
      AWS_REGION: "us-east-1",
      AWS_SECRET_ACCESS_KEY: "test",
      UPLOAD_BUCKET_NAME: "bus-impl-e2e-uploads",
      UPLOAD_KEY_PREFIX: "uploads",
      UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS: "900",
    },
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: isCi ? "on-first-retry" : "retain-on-failure",
    video: "off",
  },
});
