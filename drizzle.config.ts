import { defineConfig } from "drizzle-kit";

function readEnv(name: string): string | undefined {
  const value = Reflect.get(process.env, name);
  return typeof value === "string" ? value : undefined;
}

function localPostgresUrl(database: string): string {
  const url = new URL("postgres://127.0.0.1:5432");
  url.username = "postgres";
  url.password = "postgres";
  url.pathname = database;
  return url.toString();
}

export default defineConfig({
  schema: [
    "./src/user/infrastructure/persistence/drizzle/schema.ts",
    "./src/product/infrastructure/persistence/drizzle/schema.ts",
    "./src/auth/infrastructure/persistence/drizzle/schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: readEnv("DATABASE_URL") ?? localPostgresUrl("bus_impl"),
  },
  strict: true,
  verbose: true,
});
