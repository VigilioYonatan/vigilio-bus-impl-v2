import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", ["ACTIVE", "SUSPENDED"]);

/**
 * Registro global de tenants (`tenants`).
 *
 * - El registro es global (no tenant-scoped): el acceso se gobierna por la
 *   capacidad privilegiada `tenant:tenants:index`, nunca por un tenant_id de
 *   request. Esta capacidad no escribe estado.
 * - `slug` es la identidad de enrutamiento global: unico a nivel global,
 *   inmutable una vez creado (invariante del modelo; su correccion pertenece a
 *   un modelo de correccion explicito, no a este listado).
 * - `version` es el detector de concurrencia optimista de las mutaciones del
 *   modulo (`suspend-tenant`/`reactivate-tenant`/`update`).
 * - `suspension_reason` es obligatoria mientras el estado es `SUSPENDED` y
 *   null en `ACTIVE`: el check de estado lo refuerza en DB para que ninguna
 *   carrera pueda persistir una combinacion invalida. La validacion "amigable"
 *   pertenece a los casos de uso de comando. Su capacidad (1..1000) queda
 *   alineada al contrato aceptado de `tenant.suspend-tenant` (GAP-04) antes
 *   de la primera migracion versionada: no existe tabla ni dato aplicado.
 * - `created_at`/`updated_at` en UTC distinguen creacion de actualizacion.
 *
 * Indices y constraints (justificados por el patron exacto de
 * `EP-TENANT-TENANTS-INDEX-001`; sin indices especulativos):
 * 1. `tenants_slug_unique` — unicidad global de la identidad de enrutamiento.
 * 2. `tenants_created_at_id_idx` — orden determinista `created_at + id`
 *    (forward/backward scan) con y sin filtros.
 * 3. `tenants_status_created_at_id_idx` — filtro declarado por `status` mas el
 *    mismo orden determinista dentro del estado.
 * La forma fisica de tabla/indices/constraint queda sujeta a la migracion
 * versionada (GAP de APPLY: `drizzle/**` fuera de `allowed_paths`).
 */
export const tenantTable = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: tenantStatusEnum("status").default("ACTIVE").notNull(),
    suspension_reason: varchar("suspension_reason", { length: 1000 }),
    version: integer("version").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tenants_slug_unique").on(table.slug),
    index("tenants_created_at_id_idx").on(table.created_at, table.id),
    index("tenants_status_created_at_id_idx").on(table.status, table.created_at, table.id),
    check(
      "tenants_suspension_reason_state_check",
      sql`(${table.status} = 'ACTIVE' AND ${table.suspension_reason} IS NULL) OR (${table.status} = 'SUSPENDED' AND ${table.suspension_reason} IS NOT NULL)`,
    ),
  ],
);
