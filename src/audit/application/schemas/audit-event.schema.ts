import { z } from "zod";

/**
 * Proyeccion publica y redactada de un evento de auditoria (`audit_event`).
 *
 * `metadata` solo transporta JSON ya redactado por el owner que registro el
 * evento: aqui nunca se exponen secretos, tokens ni payloads crudos. El campo
 * es `null` cuando el evento no adjunta metadatos.
 */
export const auditEventSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid().nullable(),
  actor_id: z.string().trim().min(1).max(160),
  action: z.string().trim().min(1).max(120),
  resource_type: z.string().trim().min(1).max(80),
  resource_id: z.string().trim().min(1).max(160).nullable(),
  reason: z.string().trim().max(500).nullable(),
  correlation_id: z.string().trim().min(1).max(128),
  occurred_at: z.iso.datetime(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export type AuditEventSchema = z.infer<typeof auditEventSchema>;
