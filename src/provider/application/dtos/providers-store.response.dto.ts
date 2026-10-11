import { z } from "zod";
import { providerSchema } from "../schemas/provider.schema";

/**
 * Envelope de exito de `POST /providers`.
 *
 * `result` es la proyeccion publica confirmada del agregado `provider`
 * (jamas una fila Drizzle ni columnas internas) y `version` el valor de
 * concurrencia optimista post-commit; la creacion inicia en el default de
 * base de datos `1`. Secretos, hashes y stack traces estan prohibidos en esta
 * forma.
 */
export const providersStoreResponseDto = z.object({
  success: z.literal(true),
  result: providerSchema,
  version: z.number().int().min(1),
});

export type ProvidersStoreResponseDto = z.infer<typeof providersStoreResponseDto>;
