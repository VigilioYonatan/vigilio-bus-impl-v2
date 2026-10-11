import { z } from "zod";
import { auditExportFormatValues, auditExportStatusValues } from "../schemas/audit-export.schema";

/**
 * Respuesta de exito de `POST /audit-exports` (aceptacion asincrona).
 *
 * `result` es la identidad durable confirmada por PostgreSQL — jamas el
 * artefacto exportado ni filas de `audit_event`: la generacion y entrega del
 * artefacto pertenecen al worker (`events.md`). `status` usa el vocabulario
 * inicial `REQUESTED` (unico estado que este caso de uso produce) y
 * `requested_at` es el timestamp UTC de la solicitud confirmada.
 */
export const auditExportResponseDto = z.object({
  success: z.literal(true),
  result: z.object({
    export_id: z.uuid(),
    status: z.enum(auditExportStatusValues),
    format: z.enum(auditExportFormatValues),
    requested_at: z.iso.datetime(),
  }),
});

export type AuditExportResponseDto = z.infer<typeof auditExportResponseDto>;
