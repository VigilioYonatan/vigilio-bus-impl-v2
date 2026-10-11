import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { normalizationMappingStatusValues } from "@/provider/application/schemas/normalization-mapping.schema";
import { providerStatusValues } from "@/provider/application/schemas/provider.schema";
import { providerAccountStatusValues } from "@/provider/application/schemas/provider-account.schema";

export const providerStatusEnum = pgEnum("provider_status", providerStatusValues);

/**
 * Agregado `provider` del contexto `provider` (`providers`).
 *
 * - `tenant_id` es el owner del registro: viaja solo desde el contexto de
 *   confianza (nunca desde body/query/path) y encabeza la identidad de
 *   negocio durable.
 * - `code` slug es la identidad de negocio local al tenant: unica POR TENANT
 *   (`providers_tenant_code_unique`): el constraint es el guard final de
 *   carreras del alta duplicada.
 * - `status` usa el vocabulario canonico `ACTIVE|DISABLED`. El valor inicial
 *   persistido por la creacion (D1) NO esta confirmado por el owner: este
 *   schema no declara default y la migracion versionada (S2) debe materializar
 *   el valor confirmado antes de cualquier activacion; APPLY no improvisa
 *   ningun valor.
 * - `version` es el detector de concurrencia optimista de las mutaciones del
 *   modulo (`providers-update`); la creacion inicia en el default de base de
 *   datos `1`.
 * - `created_at`/`updated_at` en UTC distinguen creacion de actualizacion.
 *
 * Indices (justificados por el patron exacto de
 * `EP-PROVIDER-PROVIDERS-STORE-001`; sin indices especulativos):
 * 1. `providers_tenant_code_unique` — identidad de negocio durable unica por
 *    tenant y guard final de carreras del alta duplicada.
 *
 * La tabla fisica requiere la migracion versionada (S2, `drizzle/**` fuera
 * de `allowed_paths`); su ausencia no se compensa con SQL ad-hoc.
 */
export const providerTable = pgTable(
  "providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: providerStatusEnum("status").notNull(),
    version: integer("version").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("providers_tenant_code_unique").on(table.tenant_id, table.code)],
);

export const normalizationMappingStatusEnum = pgEnum(
  "normalization_mapping_status",
  normalizationMappingStatusValues,
);

/**
 * Agregado `normalization_mapping` del contexto `provider`
 * (`normalization_mappings`).
 *
 * - `tenant_id` es el owner del registro: viaja solo desde el contexto de
 *   confianza (nunca desde body/query/path) y encabeza la identidad de negocio
 *   durable.
 * - `provider_id` referencia un provider del MISMO tenant; la precondicion se
 *   valida en application logic y se refuerza en el adapter del modulo (read
 *   purpose-specific o insert guardado con el predicado de tenant) cuando la
 *   estrategia de referencia same-tenant se materialice con S2.
 * - `source_field`/`source_value` son el par origen del proveedor y
 *   `canonical_field`/`canonical_value` el target aprobado; sin maximos
 *   fabricados (GAP-04: la autoridad canonica no declara longitudes).
 * - `status` usa el vocabulario canonico `DRAFT|ACTIVE|RETIRED`. El valor
 *   inicial persistido por la creacion (D3) NO esta confirmado por el owner:
 *   este schema no declara default y la migracion versionada (S2) debe
 *   materializar el valor confirmado antes de cualquier activacion; APPLY no
 *   improvisa ningun valor.
 * - `version` es el detector de concurrencia optimista de las mutaciones del
 *   modulo; la creacion inicia en el default de base de datos `1`.
 * - `created_at`/`updated_at` en UTC distinguen creacion de actualizacion.
 *
 * D2: la identidad de negocio durable tenant-local (recomendacion
 * `(tenant_id, provider_id, source_field, source_value)`) no esta confirmada:
 * este schema NO declara el indice unico ni nombres fisicos de constraint; la
 * migracion (S2) los materializa con la semantica confirmada y el adapter
 * traduce su `23505` a `NormalizationMappingIdentityConflictError`. No se
 * crean indices especulativos.
 *
 * La tabla fisica requiere la migracion versionada (S2, `drizzle/**` fuera de
 * `allowed_paths`); su ausencia no se compensa con SQL ad-hoc.
 */
export const normalizationMappingTable = pgTable("normalization_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  provider_id: uuid("provider_id").notNull(),
  source_field: text("source_field").notNull(),
  source_value: text("source_value").notNull(),
  canonical_field: text("canonical_field").notNull(),
  canonical_value: text("canonical_value").notNull(),
  status: normalizationMappingStatusEnum("status").notNull(),
  version: integer("version").default(1).notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export const providerAccountStatusEnum = pgEnum(
  "provider_account_status",
  providerAccountStatusValues,
);

/**
 * Agregado `provider_account` del contexto `provider` (`provider_accounts`).
 *
 * - `tenant_id` es el owner del registro: viaja solo desde el contexto de
 *   confianza (nunca desde body/query/path) y encabeza la identidad de
 *   negocio durable.
 * - `provider_id` referencia un provider del MISMO tenant; la precondicion se
 *   valida en application logic y se refuerza en el adapter del modulo (read
 *   purpose-specific o insert guardado con el predicado de tenant) cuando la
 *   estrategia de referencia same-tenant se materialice con S2.
 * - `external_account_id` es la identidad del proveedor (varchar 200, el
 *   unico maximo declarado por la autoridad canonica; trim una sola vez en el
 *   boundary). No es un slug: se preserva el caso.
 * - `currency` es la moneda de liquidacion ISO-4217 como texto exacto,
 *   canonicalizada una sola vez en el boundary (trim + uppercase de un codigo
 *   de 3 letras); jamas numerica ni autoridad de punto flotante.
 * - `secret_ref` es una referencia opaca al gestor de secretos, NUNCA un valor
 *   secreto: no se resuelve, transporta ni registra. Su exposicion en la
 *   proyeccion publica confirmada (D6) NO esta aprobada: el schema de dominio
 *   la omite por default fail-closed (A) y la respuesta no transporta ningun
 *   campo de secreto/referencia.
 * - `status` usa el vocabulario canonico `ACTIVE|DISABLED`. El valor inicial
 *   persistido por la creacion (D5) NO esta confirmado por el owner: este
 *   schema no declara default y la migracion versionada (S2) debe materializar
 *   el valor confirmado antes de cualquier activacion; APPLY no improvisa
 *   ningun valor.
 * - `version` es el detector de concurrencia optimista de las mutaciones del
 *   modulo (`provider-accounts-update`); la creacion inicia en el default de
 *   base de datos `1`.
 * - `created_at`/`updated_at` en UTC distinguen creacion de actualizacion.
 *
 * D4: la identidad de negocio durable tenant-local (recomendacion
 * `(tenant_id, provider_id, external_account_id)`) no esta confirmada: este
 * schema NO declara el indice unico ni nombres fisicos de constraint; la
 * migracion (S2) los materializa con la semantica confirmada y el adapter
 * traducira su `23505` a `ProviderAccountIdentityConflictError`. No se crean
 * indices especulativos (el indice de identidad y el refuerzo de referencia
 * same-tenant se justifican con el patron exacto de
 * `EP-PROVIDER-PROVIDER-ACCOUNTS-STORE-001` en la migracion).
 *
 * La tabla fisica requiere la migracion versionada (S2, `drizzle/**` fuera
 * de `allowed_paths`); su ausencia no se compensa con SQL ad-hoc.
 */
export const providerAccountTable = pgTable("provider_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  provider_id: uuid("provider_id").notNull(),
  external_account_id: varchar("external_account_id", { length: 200 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  secret_ref: text("secret_ref").notNull(),
  status: providerAccountStatusEnum("status").notNull(),
  version: integer("version").default(1).notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});
