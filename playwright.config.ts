import path from "node:path";
import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile?.();
} catch {}

const isCi = Boolean(process.env.CI);
const projectSlug = (process.env.VIGILIO_PROJECT_SLUG ?? path.basename(import.meta.dirname))
  .toLowerCase()
  .replaceAll(/[^a-z0-9]+/g, "-")
  .replaceAll(/^-+|-+$/g, "");
if (!projectSlug) throw new Error("Unable to infer VIGILIO_PROJECT_SLUG");
const databaseSlug = projectSlug.replaceAll("-", "_");
const apiPort = positivePort(process.env.E2E_API_PORT ?? "3100", "E2E_API_PORT");
const apiBaseUrl = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${apiPort}`;

function localPostgresUrl(database: string): string {
  const host = process.env.E2E_POSTGRES_HOST ?? "127.0.0.1";
  const port = positivePort(process.env.E2E_POSTGRES_PORT ?? "5432", "E2E_POSTGRES_PORT");
  const url = new URL(`postgres://${host}:${port}`);
  url.username = process.env.E2E_POSTGRES_USER ?? "postgres";
  url.password = process.env.E2E_POSTGRES_PASSWORD ?? "postgres";
  url.pathname = database;
  return url.toString();
}

function positivePort(value: string, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be a valid port`);
  }
  return port;
}

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  timeout: 30_000,
  // Un solo worker evita carreras de seed/cleanup sobre la DB E2E aislada del proyecto.
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
    command:
      "node --env-file-if-exists=.env node_modules/@vigilioyonatan/node-nest-tooling/dist/bin/cli.js setup-e2e-db && node --env-file-if-exists=.env --import tsx scripts/seed-local-db.ts && node --env-file-if-exists=.env --import tsx src/main.ts",
    url: `${apiBaseUrl}/ready`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      APP_STAGE: "local",
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? localPostgresUrl(`${databaseSlug}_e2e`),
      E2E_DATABASE_ADMIN_URL: process.env.E2E_DATABASE_ADMIN_URL ?? localPostgresUrl("postgres"),
      E2E_DATABASE_URL: process.env.E2E_DATABASE_URL ?? localPostgresUrl(`${databaseSlug}_e2e`),
      GOOGLE_CLIENT_ID:
        process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id.apps.googleusercontent.com",
      JWT_SECRET: process.env.JWT_SECRET ?? "local-e2e-secret-change-me-please-32-chars",
      NODE_ENV: "test",
      PORT: String(apiPort),
      AWS_ACCESS_KEY_ID: "test",
      AWS_REGION: "us-east-1",
      AWS_SECRET_ACCESS_KEY: "test",
      UPLOAD_BUCKET_NAME: `${projectSlug}-e2e-uploads`,
      UPLOAD_KEY_PREFIX: "uploads",
      UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS: "900",
    },
  },
  use: {
    baseURL: apiBaseUrl,
    screenshot: "only-on-failure",
    trace: isCi ? "on-first-retry" : "retain-on-failure",
    video: "off",
  },
});
