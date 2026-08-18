import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

function localPostgresUrl(database: string): string {
  const host = process.env["E2E_POSTGRES_HOST"] ?? "127.0.0.1";
  const port = positivePort(process.env["E2E_POSTGRES_PORT"] ?? "5432");
  const url = new URL(`postgres://${host}:${port}`);
  url.username = process.env["E2E_POSTGRES_USER"] ?? "postgres";
  url.password = process.env["E2E_POSTGRES_PASSWORD"] ?? "postgres";
  url.pathname = database;
  return url.toString();
}

function projectDatabaseName(suffix: string): string {
  const projectName = process.env["VIGILIO_PROJECT_SLUG"] ?? path.basename(projectRoot);
  const slug = projectName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!slug) throw new Error("No se pudo inferir VIGILIO_PROJECT_SLUG");
  return `${slug}${suffix}`.slice(0, 63);
}

function positivePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("E2E_POSTGRES_PORT debe ser un puerto valido");
  }
  return port;
}

function runNode(
  entrypoint: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const defaultDatabaseName = process.env["E2E_DATABASE_NAME"] ?? projectDatabaseName("_e2e");
const databaseUrl = process.env["E2E_DATABASE_URL"] ?? localPostgresUrl(defaultDatabaseName);
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

if (process.env["E2E_DATABASE_NAME"] && process.env["E2E_DATABASE_NAME"] !== databaseName) {
  throw new Error("E2E_DATABASE_NAME y E2E_DATABASE_URL deben apuntar a la misma base");
}

if (!databaseName.endsWith("_e2e") && !databaseName.endsWith("_integration")) {
  throw new Error("E2E_DATABASE_URL debe apuntar a una base aislada *_e2e o *_integration");
}

const environment: NodeJS.ProcessEnv = {
  ...process.env,
  E2E_DATABASE_ADMIN_URL: process.env["E2E_DATABASE_ADMIN_URL"] ?? localPostgresUrl("postgres"),
  E2E_DATABASE_NAME: process.env["E2E_DATABASE_NAME"] ?? databaseName,
  E2E_DATABASE_URL: databaseUrl,
};

runNode(
  path.join(
    projectRoot,
    "node_modules",
    "@vigilioyonatan",
    "node-nest-tooling",
    "dist",
    "bin",
    "cli.js",
  ),
  ["setup-e2e-db"],
  environment,
);

runNode(
  path.join(projectRoot, "node_modules", "vitest", "vitest.mjs"),
  ["run", "--config", "vitest.integration.config.ts", ...process.argv.slice(2)],
  environment,
);
