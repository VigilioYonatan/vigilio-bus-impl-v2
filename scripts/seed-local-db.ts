import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseSchema } from "@/shared/infrastructure/database/database.schema";
import { runDatabaseSeeders } from "@/shared/infrastructure/database/seeders/seed-runner";
import { readEnv } from "@/shared/infrastructure/env/read-env";

function localPostgresUrl(database: string): string {
  const url = new URL("postgres://127.0.0.1:5432");
  url.username = "postgres";
  url.password = "postgres";
  url.pathname = database;
  return url.toString();
}

const databaseUrl = readEnv("DATABASE_URL") ?? localPostgresUrl("bus_impl");
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
