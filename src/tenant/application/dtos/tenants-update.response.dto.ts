import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Envelope de exito de `PATCH /tenants/{tenantId}`.
 *
 * `result` es la proyeccion publica confirmada del registro `tenant` tras el
 * commit (nombre actualizado, `version` incrementada y `updated_at` avanzado)
 * y `version` es el valor de concurrencia optimista post-commit que el
 * siguiente comando debe usar como `expected_version`. Secretos, credenciales
 * y stack traces estan prohibidos en esta forma; jamas se retorna una fila
 * Drizzle ni columnas internas.
 */
export const tenantsUpdateResponseDto = z.object({
  success: z.literal(true),
  result: tenantSchema,
  version: z.number().int().min(1),
});

export type TenantsUpdateResponseDto = z.infer<typeof tenantsUpdateResponseDto>;
