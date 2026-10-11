import { z } from "zod";

/**
 * Formatos de artefacto aceptados por `POST /audit-exports`
 * (`EP-AUDIT-EXPORT-AUDIT-001`). El contrato acepta exactamente `CSV|JSON`;
 * ningun otro valor se coercion ni se acepta, y no existe default implicito.
 */
export const auditExportFormatValues = ["CSV", "JSON"] as const;

/**
 * Estados del ciclo de vida del export asincrono.
 *
 * `REQUESTED` es el unico estado que produce este caso de uso: el evento
 * aceptado `AuditExportRequested.v1` (`EVT-AUDIT-EXPORT-AUDIT-001`) anuncia la
 * solicitud confirmada y la respuesta modela aceptacion asincrona, no entrega
 * de artefacto. Los estados posteriores (generacion, entrega, vencimiento)
 * pertenecen al worker de export y no se inventan en este slice.
 */
export const auditExportStatusValues = ["REQUESTED"] as const;

/**
 * Estado inicial persistido por una solicitud aceptada.
 */
export const auditExportInitialStatus: (typeof auditExportStatusValues)[number] = "REQUESTED";

/**
 * Identificador canonico del resultado de negocio `STEP_UP_OR_APPROVAL_REQUIRED`
 * (`business.md` §8, `endpoints.md` §5).
 *
 * Viaja como mensaje publico estable del 403 porque el envelope de error
 * actual (`apiErrorResponseDto`) no expone campo `code`: asi el cliente
 * distingue la precondicion de step-up/aprobacion de un `forbidden` generico
 * sin revelar detalles internos. Q-010: la sesion normal nunca sustituye el
 * step-up de una operacion clasificada sensible (esta exportacion lo esta).
 */
export const auditExportStepUpApprovalRequired = "STEP_UP_OR_APPROVAL_REQUIRED";

/**
 * Elementos de los filtros opcionales del export.
 *
 * Las longitudes replican las columnas propiedad de `audit_event`
 * (`action` 120, `actor_id` 160, `resource_type` 80): son limites ya ownerizados
 * por el slice canonico de datos y no se inventa ninguno nuevo.
 */
const auditExportActionSchema = z.string().trim().min(1).max(120);
const auditExportActorIdSchema = z.string().trim().min(1).max(160);
const auditExportResourceTypeSchema = z.string().trim().min(1).max(80);

/**
 * Cuerpo aceptado por `POST /audit-exports`: solicitud de exportacion
 * auditable y acotada de eventos de auditoria.
 *
 * - `from`/`to` son obligatorios: sin rango declarado la exportacion quedaria
 *   ilimitada y el invariante canonico "Export range is bounded" no se cumple.
 * - `to >= from` se valida estructuralmente sobre los instantes ya parseados.
 * - `format` (`CSV|JSON`) y `reason` son obligatorios; `reason` es la
 *   justificacion gobernada de la operacion sensible y nunca se registra en
 *   telemetria.
 * - `strictObject` rechaza campos no declarados (anti mass-assignment): un
 *   `tenant_id` o un `actor_id` inyectado en el body jamas eleva el alcance;
 *   el actor y el tenant provienen solo de la sesion de confianza.
 * - Los maximos numericos de span `from..to` y de tamano de arreglos no tienen
 *   owner canonico (GAP-10): se mantienen como GAP documentado y no se
 *   inventan valores.
 */
export const auditExportRequestSchema = z
  .strictObject({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
    actions: z.array(auditExportActionSchema).optional(),
    actor_ids: z.array(auditExportActorIdSchema).optional(),
    resource_types: z.array(auditExportResourceTypeSchema).optional(),
    format: z.enum(auditExportFormatValues),
    reason: z.string().trim().min(1).max(500),
  })
  .superRefine((value, context) => {
    if (Date.parse(value.to) < Date.parse(value.from)) {
      context.addIssue({
        code: "custom",
        message: "`to` debe ser mayor o igual que `from`",
        path: ["to"],
      });
    }
  });

export type AuditExportRequestSchema = z.infer<typeof auditExportRequestSchema>;
export type AuditExportFormat = (typeof auditExportFormatValues)[number];
export type AuditExportStatus = (typeof auditExportStatusValues)[number];
