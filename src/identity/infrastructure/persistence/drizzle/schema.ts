import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { identityUserStatusValues } from "@/identity/application/schemas/identity-user.schema";

export const identityUserStatusEnum = pgEnum("identity_user_status", identityUserStatusValues);

/**
 * Agregado `user` del contexto `identity` (`identity_users`).
 *
 * - `tenant_id` es el owner del registro: viaja solo desde el contexto de
 *   confianza (nunca desde body/query/path) y encabeza la identidad de
 *   negocio durable.
 * - `email` normalizado es unico POR TENANT (`identity_users_tenant_email_unique`):
 *   el constraint es el guard final de carreras del alta duplicada.
 * - `status` usa el vocabulario canonico `PENDING|ACTIVE|DISABLED`. El valor
 *   inicial persistido por la creacion (D2) NO esta confirmado por el owner:
 *   este schema no declara default y la migracion versionada (S2) debe
 *   materializar el valor confirmado antes de cualquier activacion; APPLY no
 *   improvisa ningun valor.
 * - `role_ids` representa los roles autorizados como `uuid[]` sobre la propia
 *   fila: el write set aceptado nombra solo `user` + `audit_event`, sin tabla
 *   de asignacion adicional.
 * - `version` es el detector de concurrencia optimista de las mutaciones del
 *   modulo (`users-update`); la creacion inicia en el default de base de
 *   datos `1`.
 * - `created_at`/`updated_at` en UTC distinguen creacion de actualizacion.
 *
 * Indices (justificados por el patron exacto de
 * `EP-IDENTITY-USERS-STORE-001`; sin indices especulativos):
 * 1. `identity_users_tenant_email_unique` — identidad de negocio durable
 *    unica por tenant y guard final de carreras del alta duplicada.
 *
 * La tabla fisica requiere la migracion versionada (S2, `drizzle/**` fuera
 * de `allowed_paths`); su ausencia no se compensa con SQL ad-hoc.
 */
export const identityUserTable = pgTable(
  "identity_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id").notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    display_name: varchar("display_name", { length: 160 }).notNull(),
    status: identityUserStatusEnum("status").notNull(),
    role_ids: uuid("role_ids").array().notNull(),
    version: integer("version").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("identity_users_tenant_email_unique").on(table.tenant_id, table.email)],
);
