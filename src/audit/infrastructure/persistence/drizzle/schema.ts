import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  auditExportFormatValues,
  auditExportStatusValues,
} from "@/audit/application/schemas/audit-export.schema";

/**
 * Evidencia de auditoria append-only (`audit_event`).
 *
 * - `tenant_id` es nullable por contrato: `NULL` representa eventos globales
 *   (plataforma) y un valor representa eventos tenant-scoped. El listado
 *   `GET /audit-events` filtra por `tenant_id = tenant de confianza`, por lo
 *   que jamas expone filas globales ni de otros tenants.
 * - `occurred_at` distingue la ocurrencia del evento del tiempo de proceso.
 * - `metadata` transporta solo JSON ya redactado por el owner que registra el
 *   evento; no es un canal para secretos ni payloads crudos.
 * - La tabla es de solo-lectura para este caso de uso: no se muta estado
 *   canonico desde `audit.audit-index`.
 *
 * Indices (justificados por el patron exacto de `EP-AUDIT-AUDIT-INDEX-001`):
 * 1. `(tenant_id, occurred_at, id)` soporta el predicado de tenant mas el orden
 *    determinista `occurred_at` + tie-breaker `id` (forward/backward scan).
 * 2. `(tenant_id, action)` soporta el filtro por accion dentro del tenant.
 * 3. `(tenant_id, actor_id)` soporta el filtro por actor dentro del tenant.
 * No se agregan indices especulativos fuera de estos filtros declarados.
 */
export const auditEventTable = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id"),
    actor_id: varchar("actor_id", { length: 160 }).notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    resource_type: varchar("resource_type", { length: 80 }).notNull(),
    resource_id: varchar("resource_id", { length: 160 }),
    reason: varchar("reason", { length: 500 }),
    correlation_id: varchar("correlation_id", { length: 128 }).notNull(),
    occurred_at: timestamp("occurred_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("audit_events_tenant_occurred_at_idx").on(table.tenant_id, table.occurred_at, table.id),
    index("audit_events_tenant_action_idx").on(table.tenant_id, table.action),
    index("audit_events_tenant_actor_idx").on(table.tenant_id, table.actor_id),
  ],
);

export const auditExportStatusEnum = pgEnum("audit_export_status", auditExportStatusValues);
export const auditExportFormatEnum = pgEnum("audit_export_format", auditExportFormatValues);

/**
 * Solicitud de export auditable (`audit_export`).
 *
 * - `tenant_id` es obligatorio: el agregado es tenant-scoped y el alcance se
 *   resuelve desde la sesion de confianza; la posesion de identificadores no
 *   otorga acceso. La migracion versionada debe probar ownership antes de
 *   reforzar NOT NULL/unique (fuera de `allowed_paths`, GAP-02).
 * - `operation` + `request_hash` materializan la identidad durable de
 *   idempotencia junto con `tenant_id`: una repeticion logica del mismo
 *   comando converge al mismo export (la unicidad es el guard final de
 *   carreras) en lugar de duplicar el efecto.
 * - `status` y `format` usan enums controlados por el vocabulario del
 *   contrato; el estado inicial `REQUESTED` es el unico que produce este
 *   caso de uso.
 * - `range_from`/`range_to` y los filtros opcionales persisten el conjunto
 *   canonico solicitado; `reason` no se duplica aqui: vive como evidencia
 *   gobernada en `audit_event` (minimizacion).
 * - `requested_at` distingue el tiempo de solicitud de la ocurrencia del
 *   evento; `correlation_id` preserva la traza de la ejecucion.
 *
 * Indices (justificados por los lookups documentados; sin especulativos):
 * 1. `audit_exports_tenant_operation_request_hash_unique` — resolucion de
 *    idempotencia (tenant + operacion + hash) y guard final de carreras;
 *    es tambien el unico lookup de lectura implementado en este slice.
 */
export const auditExportTable = pgTable(
  "audit_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id").notNull(),
    operation: varchar("operation", { length: 80 }).notNull(),
    request_hash: varchar("request_hash", { length: 64 }).notNull(),
    status: auditExportStatusEnum("status").notNull(),
    format: auditExportFormatEnum("format").notNull(),
    range_from: timestamp("range_from", { withTimezone: true, mode: "string" }).notNull(),
    range_to: timestamp("range_to", { withTimezone: true, mode: "string" }).notNull(),
    actions: jsonb("actions").$type<string[]>(),
    actor_ids: jsonb("actor_ids").$type<string[]>(),
    resource_types: jsonb("resource_types").$type<string[]>(),
    correlation_id: varchar("correlation_id", { length: 128 }).notNull(),
    requested_at: timestamp("requested_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("audit_exports_tenant_operation_request_hash_unique").on(
      table.tenant_id,
      table.operation,
      table.request_hash,
    ),
  ],
);
