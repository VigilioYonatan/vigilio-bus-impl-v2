import { z } from "zod";
import { normalizationMappingSchema } from "../schemas/normalization-mapping.schema";

/**
 * Envelope de exito de `POST /normalization-mappings`.
 *
 * `result` es la proyeccion publica confirmada del agregado
 * `normalization_mapping` (jamas una fila Drizzle ni columnas internas) y
 * `version` el valor de concurrencia optimista post-commit; la creacion inicia
 * en el default de base de datos `1`. Secretos, credenciales y stack traces
 * estan prohibidos en esta forma.
 */
export const normalizationMappingsStoreResponseDto = z.object({
  success: z.literal(true),
  result: normalizationMappingSchema,
  version: z.number().int().min(1),
});

export type NormalizationMappingsStoreResponseDto = z.infer<
  typeof normalizationMappingsStoreResponseDto
>;
