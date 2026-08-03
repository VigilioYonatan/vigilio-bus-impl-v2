import { pgEnum, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "operador", "auditor", "soporte"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "blocked"]);
export const userProviderEnum = pgEnum("user_provider", ["local", "google"]);

export const userTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 160 }).notNull(),
    full_name: varchar("full_name", { length: 120 }).notNull(),
    role: userRoleEnum("role").default("operador").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    provider: userProviderEnum("provider").default("local").notNull(),
    google_sub: varchar("google_sub", { length: 160 }),
    password_hash: varchar("password_hash", { length: 255 }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_google_sub_unique").on(table.google_sub),
  ],
);
