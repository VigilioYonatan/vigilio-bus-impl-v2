import { integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { AuditExportFormat } from "@/audit/application/schemas/audit-export.schema";

/**
 * Payload minimo que el consumidor "audit export worker" necesita para generar
 * el artefacto (`events.md`: "minimum consumer-required fields only").
 *
 * Transporta la identidad del export y el conjunto canonico de filtros/format
 * ya validado; no transporta secretos, `reason`, PII sin justificar ni
 * contenido no acotado. El `tenant_id` viaja en el envelope del evento y no se
 * duplica dentro del payload.
 */
export type AuditExportRequestedPayload = {
  export_id: string;
  from: string;
  to: string;
  actions: string[] | null;
  actor_ids: string[] | null;
  resource_types: string[] | null;
  format: AuditExportFormat;
};

/**
 * Outbox transaccional (`outbox_event`) del slice audit (ADR-003).
 *
 * - La fila se persiste en la MISMA transaccion que el estado de negocio
 *   (`audit_exports`) y la evidencia append-only (`audit_events`): no existe
 *   dual write y la publicacion al broker solo puede ocurrir post-commit.
 * - El envelope replica los campos aceptados de `AuditExportRequested.v1`:
 *   identidad `event_id` (dedup), `event_type` literal, `event_version` (un
 *   payload breaking exige version nueva), `tenant_id` de confianza,
 *   `aggregate_id` (agregado afectado: el export solicitado),
 *   `occurred_at` UTC, `correlation_id`, `causation_id` y `payload` minimo.
 * - El bookkeeping de publicacion (marcar publicado, reintentos, DLQ) y el
 *   publisher/worker viven fuera de `allowed_paths` (scope blocker S1,
 *   registrado — jamas se publica directamente desde la transaccion). Su
 *   incorporacion futura usa expand-contract (ADR-011).
 * - Nombre fisico de tabla/constraints sujeto a la migracion versionada
 *   (GAP-02: `drizzle/**` fuera de `allowed_paths`).
 */
export const outboxEventTable = pgTable("outbox_events", {
  event_id: uuid("event_id").defaultRandom().primaryKey(),
  event_type: varchar("event_type", { length: 120 }).notNull(),
  event_version: integer("event_version").notNull(),
  tenant_id: uuid("tenant_id").notNull(),
  aggregate_id: uuid("aggregate_id").notNull(),
  occurred_at: timestamp("occurred_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  correlation_id: varchar("correlation_id", { length: 128 }).notNull(),
  causation_id: varchar("causation_id", { length: 128 }),
  payload: jsonb("payload").$type<AuditExportRequestedPayload>().notNull(),
});
