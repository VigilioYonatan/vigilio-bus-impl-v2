import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Envelope de exito de `POST /tenants/{tenantId}/suspend`.
 *
 * `result` es la proyeccion publica confirmada del registro `tenant` tras el
 * commit (estado `SUSPENDED` con su razon gobernada) y `version` el valor de
 * concurrencia optimista post-commit. Secretos, credenciales y stack traces
 * estan prohibidos en esta forma; `reason` jamas entra a telemetria.
 */
export const tenantsSuspendResponseDto = z.object({
  success: z.literal(true),
  result: tenantSchema,
  version: z.number().int().min(1),
});

export type TenantsSuspendResponseDto = z.infer<typeof tenantsSuspendResponseDto>;
