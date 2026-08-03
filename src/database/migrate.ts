import "reflect-metadata";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { validateEnvironmentAsync } from "../shared/infrastructure/config/environment.schema";
import { resolveDatabaseUrl } from "../shared/infrastructure/database/database-url.resolver";

async function runMigrations(): Promise<void> {
  const environment = await validateEnvironmentAsync();
  const connectionString = await resolveDatabaseUrl({
    APP_STAGE: environment.APP_STAGE,
    AWS_REGION: environment.AWS_REGION,
    DATABASE_SECRET_ARN: environment.DATABASE_SECRET_ARN,
    DATABASE_URL: environment.DATABASE_URL,
  });
  const pool = new Pool({ connectionString, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: path.resolve("drizzle") });
    console.info("database_migrations_completed");
  } finally {
    await pool.end();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
