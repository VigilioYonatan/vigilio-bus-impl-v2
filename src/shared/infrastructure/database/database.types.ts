import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { databaseSchema } from "./database.schema";

export type AppDatabase = NodePgDatabase<typeof databaseSchema>;
