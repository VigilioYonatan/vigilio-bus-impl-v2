import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseSchema } from "@/shared/infrastructure/database/database.schema";
import { runDatabaseSeeders } from "@/shared/infrastructure/database/seeders/seed-runner";
import { readEnv } from "@/shared/infrastructure/env/read-env";

function localPostgresUrl(database: string): string {
  const host = process.env["LOCAL_POSTGRES_HOST"] ?? "127.0.0.1";
  const port = positivePort(process.env["LOCAL_POSTGRES_PORT"] ?? "5432");
  const url = new URL(`postgres://${host}:${port}`);
  url.username = process.env["LOCAL_POSTGRES_USER"] ?? "postgres";
  url.password = process.env["LOCAL_POSTGRES_PASSWORD"] ?? "postgres";
  url.pathname = database;
  return url.toString();
}

function projectDatabaseName(): string {
  const projectName =
    process.env["VIGILIO_PROJECT_SLUG"] ?? path.basename(path.resolve(import.meta.dirname, ".."));
  const slug = projectName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!slug) throw new Error("No se pudo inferir VIGILIO_PROJECT_SLUG");
  return slug.slice(0, 63);
}

function positivePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("LOCAL_POSTGRES_PORT debe ser un puerto valido");
  }
  return port;
}

const databaseUrl = readEnv("DATABASE_URL") ?? localPostgresUrl(projectDatabaseName());
const pool = new Pool({
  connectionString: databaseUrl,
  max: 2,
});

try {
  const db = drizzle(pool, { schema: databaseSchema });
  const result = await runDatabaseSeeders(db);

  console.log("Local seed completed.");
  console.log(`Admin: admin.local@rimac.test / AdminPassword2026!`);
  console.log(`Admin user id: ${result.admin_user_id ?? "not-found"}`);
} finally {
  await pool.end();
}
