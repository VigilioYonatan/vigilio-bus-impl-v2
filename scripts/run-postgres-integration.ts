import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

function localPostgresUrl(database: string): string {
  const url = new URL("postgres://127.0.0.1:5432");
  url.username = "postgres";
  url.password = "postgres";
  url.pathname = database;
  return url.toString();
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

const databaseUrl = process.env["E2E_DATABASE_URL"] ?? localPostgresUrl("bus_impl_e2e");
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

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
