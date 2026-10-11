/**
 * Identidad estable del evento asincrono de `audit.export-audit`
 * (`events.md`, ACTIVE): `EVT-AUDIT-EXPORT-AUDIT-001` / `AuditExportRequested.v1`.
 *
 * Un cambio de payload breaking exige un `event_version` nuevo; el nombre y la
 * version aceptados no se reutilizan silenciosamente. El catalogo de eventos y
 * cola se puebla solo con evidencia ejecutada (GAP-12).
 */
export const AUDIT_EXPORT_EVENTS = {
  exportRequested: {
    id: "EVT-AUDIT-EXPORT-AUDIT-001",
    type: "AuditExportRequested",
    version: 1,
  },
} as const;

/**
 * Operacion estable del caso de uso: participa en la identidad durable de
 * idempotencia (tenant + operacion + hash de request) y es el `action` de la
 * evidencia append-only registrada en `audit_event`.
 */
export const AUDIT_EXPORT_OPERATION = "audit.export-audit";
