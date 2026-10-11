import { z } from "zod";
import { auditEventSchema } from "../schemas/audit-event.schema";

/**
 * Respuesta exitosa de `GET /audit-events/{auditEventId}`: un unico evento
 * autorizado del tenant de confianza, con la proyeccion redactada
 * compartida (`audit_event`). No transporta filas crudas ni columnas internas.
 */
export const auditShowResponseDto = z.object({
  success: z.literal(true),
  result: auditEventSchema,
});

export type AuditShowResponseDto = z.infer<typeof auditShowResponseDto>;
