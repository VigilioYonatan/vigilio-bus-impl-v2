import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { numericStringCustom } from "@/shared/infrastructure/persistence/drizzle/custom-types/numeric-custom-types";

export const productStatusEnum = pgEnum("product_status", ["active", "inactive", "archived"]);

export const productTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sku: varchar("sku", { length: 40 }).notNull(),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    descripcion: text("descripcion"),
    precio: numericStringCustom("precio", 12, 2).notNull(),
    stock: integer("stock").default(0).notNull(),
    status: productStatusEnum("status").default("active").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("products_sku_unique").on(table.sku)],
);
