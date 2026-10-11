import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Parametros de ruta de `POST /tenants/{tenantId}/suspend`
 * (`EP-TENANT-SUSPEND-TENANT-001`).
 *
 * El contrato acepta exactamente el identificador inmutable del tenant
 * (`id` uuid del slice canonico): no requiere coercion y cualquier otro valor
 * se rechaza antes de autorizar o consultar la base. La posesion del
 * identificador jamas otorga alcance.
 */
export const tenantsSuspendParamsDto = z.object({
  tenantId: tenantSchema.shape.id,
});

export type TenantsSuspendParamsDto = z.infer<typeof tenantsSuspendParamsDto>;

/**
 * Cuerpo aceptado por `POST /tenants/{tenantId}/suspend`.
 *
 * Deriva del slice canonico `tenant` las dos unicas superficies aceptadas por
 * el contrato:
 * - `expected_version` es el valor de concurrencia optimista que el operador
 *   observo (`version` del registro); el mismatch es 409 y nunca last-write-wins.
 * - `reason` es la justificacion gobernada de la operacion (`suspension_reason`
 *   requerida mientras `SUSPENDED`); se canonicaliza (`trim`) una sola vez en
 *   el boundary y nunca se registra en telemetria.
 *
 * Es una mutacion: los campos no declarados se rechazan en el borde
 * (`strictObject`) para impedir mass-assignment de estado/version/tenant por
 * body; ningun header de sesion se acepta como alias de estos campos.
 */
export const tenantsSuspendRequestDto = z.strictObject({
  expected_version: tenantSchema.shape.version,
  reason: tenantSchema.shape.suspension_reason.unwrap(),
});

export type TenantsSuspendRequestDto = z.infer<typeof tenantsSuspendRequestDto>;
