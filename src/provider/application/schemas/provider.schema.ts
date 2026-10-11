import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

/**
 * Estados del ciclo de vida del provider (`provider.status`).
 *
 * La unica transicion aceptada por el catalogo del modulo es
 * `ACTIVE -> DISABLED` (caso de uso `disable-provider`); no existe una
 * capacidad de reactivacion en el catalogo aceptado. El valor inicial
 * persistido por la creacion (D1, recomendacion `ACTIVE`) no esta confirmado
 * por el owner y este pack no lo improvisa.
 */
export const providerStatusValues = ["ACTIVE", "DISABLED"] as const;

/**
 * Proyeccion publica del agregado `provider` del contexto `provider`.
 *
 * Es el slice canonico aceptado por `class.md`: identidad inmutable (`id`),
 * pertenencia al tenant (`tenant_id`, resuelta siempre desde el contexto de
 * confianza y jamas desde la request), `code` slug como identidad de negocio
 * durable local al tenant, nombre visible, estado de ciclo de vida, version
 * de concurrencia optimista y timestamps UTC. No expone columnas internas ni
 * material secreto: el contrato de creacion aceptado transporta solo
 * `code` + `name`. La forma fisica de tabla, constraint e indices requiere
 * evidencia de migracion real (GAP de APPLY: `drizzle/**` fuera de
 * `allowed_paths`).
 */
export const providerSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  status: z.enum(providerStatusValues),
  version: z.number().int().min(1),
  ...timestampSchema.shape,
});

export type ProviderSchema = z.infer<typeof providerSchema>;
export type ProviderStatus = (typeof providerStatusValues)[number];
