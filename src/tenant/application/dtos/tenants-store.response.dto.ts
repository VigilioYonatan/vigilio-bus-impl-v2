import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Envelope de exito de `POST /tenants`.
 *
 * `result` es la proyeccion publica confirmada del registro `tenant` (jamas
 * una fila Drizzle ni columnas internas) y `version` el valor de concurrencia
 * optimista post-commit; la creacion inicia en el default de base de datos
 * `1`. Secretos, credenciales y stack traces estan prohibidos en esta forma.
 */
export const tenantsStoreResponseDto = z.object({
  success: z.literal(true),
  result: tenantSchema,
  version: z.number().int().min(1),
});

export type TenantsStoreResponseDto = z.infer<typeof tenantsStoreResponseDto>;
