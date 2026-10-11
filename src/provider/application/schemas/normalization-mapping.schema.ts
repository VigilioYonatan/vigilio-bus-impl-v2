import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

/**
 * Estados del ciclo de vida del agregado `normalization_mapping`.
 *
 * Vocabulario canonico aceptado (`class.md`): `DRAFT | ACTIVE | RETIRED`. El
 * valor inicial persistido por la creacion (D3) NO esta confirmado por el
 * owner y este pack no lo improvisa: el schema no declara default y la
 * migracion versionada (S2) materializa el valor confirmado antes de cualquier
 * activacion.
 */
export const normalizationMappingStatusValues = ["DRAFT", "ACTIVE", "RETIRED"] as const;

/**
 * Proyeccion publica del agregado `normalization_mapping` del contexto
 * `provider`.
 *
 * Es el slice canonico aceptado por `class.md`: identidad inmutable (`id`),
 * pertenencia al tenant (`tenant_id`, resuelta siempre desde el contexto de
 * confianza y jamas desde la request), referencia a un provider del mismo
 * tenant (`provider_id`), el par origen del proveedor
 * (`source_field`/`source_value`), el target aprobado
 * (`canonical_field`/`canonical_value`), estado de ciclo de vida, version de
 * concurrencia optimista y timestamps UTC. No expone columnas internas ni
 * material secreto.
 *
 * GAP-04: la autoridad canonica no declara maximos por campo; el boundary
 * valida strings requeridos no vacios (trim en una sola canonicalizacion) y no
 * fabrica maximos de negocio. La forma fisica de tabla, constraints e indices
 * requiere evidencia de migracion real (GAP de APPLY: `drizzle/**` fuera de
 * `allowed_paths`; D2/D3 pendientes).
 */
export const normalizationMappingSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  provider_id: z.uuid(),
  source_field: z.string().trim().min(1),
  source_value: z.string().trim().min(1),
  canonical_field: z.string().trim().min(1),
  canonical_value: z.string().trim().min(1),
  status: z.enum(normalizationMappingStatusValues),
  version: z.number().int().min(1),
  ...timestampSchema.shape,
});

export type NormalizationMappingSchema = z.infer<typeof normalizationMappingSchema>;
export type NormalizationMappingStatus = (typeof normalizationMappingStatusValues)[number];
