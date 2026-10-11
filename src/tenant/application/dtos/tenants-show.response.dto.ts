import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Envelope de exito de `GET /tenants/{tenantId}`.
 *
 * `result` es la proyeccion publica confirmada del registro `tenant`
 * (identidad, nombre, estado, razon de suspension gobernada, version y
 * timestamps UTC). No se agrega un `version` de nivel superior: la version
 * propia de la proyeccion es el detector de obsolescencia de la UI y una
 * lectura no produce estado post-commit. Secretos, credenciales internas y
 * stack traces estan prohibidos en esta forma; `suspension_reason` jamas entra
 * a telemetria.
 */
export const tenantsShowResponseDto = z.object({
  success: z.literal(true),
  result: tenantSchema,
});

export type TenantsShowResponseDto = z.infer<typeof tenantsShowResponseDto>;
