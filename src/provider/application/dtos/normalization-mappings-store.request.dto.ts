import { z } from "zod";
import { normalizationMappingSchema } from "../schemas/normalization-mapping.schema";

/**
 * Payload de creacion de un mapeo de normalizacion
 * (`EP-PROVIDER-NORMALIZATION-MAPPINGS-STORE-001`).
 *
 * Deriva del slice canonico las cinco unicas superficies aceptadas por el
 * contrato: `provider_id` (referencia a un provider del mismo tenant) y el par
 * origen/target (`source_field`, `source_value`, `canonical_field`,
 * `canonical_value`), canonicalizados una sola vez en el boundary (trim del
 * schema base). Es una mutacion: los campos no declarados se rechazan en el
 * borde (`strictObject`) para impedir mass-assignment de
 * `tenant_id`/`status`/`version` por body; ningun header de sesion se acepta
 * como alias de estos campos y el tenant del mapeo creado jamas viaja en la
 * request. No duplica defaults de base de datos (D2/D3) y no fabrica maximos
 * por campo (GAP-04: la autoridad canonica no los declara).
 */
export const normalizationMappingsStoreRequestDto = z.strictObject({
  provider_id: normalizationMappingSchema.shape.provider_id,
  source_field: normalizationMappingSchema.shape.source_field,
  source_value: normalizationMappingSchema.shape.source_value,
  canonical_field: normalizationMappingSchema.shape.canonical_field,
  canonical_value: normalizationMappingSchema.shape.canonical_value,
});

export type NormalizationMappingsStoreRequestDto = z.infer<
  typeof normalizationMappingsStoreRequestDto
>;
