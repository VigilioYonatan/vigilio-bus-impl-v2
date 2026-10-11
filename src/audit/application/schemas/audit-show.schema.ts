import { z } from "zod";

/**
 * Parametros de ruta de `GET /audit-events/{auditEventId}`.
 *
 * El contrato acepta exactamente el identificador inmutable del evento
 * (`EP-AUDIT-AUDIT-SHOW-001`); es un UUID de servidor, no requiere coercion y
 * cualquier otro valor se rechaza antes de autorizar o consultar la base.
 */
export const auditShowParamsSchema = z.object({
  auditEventId: z.uuid(),
});

export type AuditShowParamsSchema = z.infer<typeof auditShowParamsSchema>;
