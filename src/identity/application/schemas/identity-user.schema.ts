import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

/**
 * Estados del ciclo de vida del usuario (`user.status`).
 *
 * `PENDING -> ACTIVE` (activacion) y `DISABLED` (deshabilitacion sin borrar
 * historia) pertenecen a los casos de uso de comando del modulo; este listado
 * solo fija el vocabulario canonico del slice. El valor inicial persistido
 * por la creacion (D2) no esta confirmado por el owner y este pack no lo
 * improvisa.
 */
export const identityUserStatusValues = ["PENDING", "ACTIVE", "DISABLED"] as const;

/**
 * Proyeccion publica del agregado `user` del contexto `identity`.
 *
 * Es el slice canonico aceptado por `class.md`: identidad inmutable (`id`),
 * pertenencia al tenant (`tenant_id`, resuelta siempre desde el contexto de
 * confianza y jamas desde la request), email normalizado (identidad de
 * negocio durable, unica por tenant), nombre visible, estado de ciclo de
 * vida, roles autorizados (`role_ids`), version de concurrencia optimista y
 * timestamps UTC. No expone columnas internas ni material secreto: el
 * contrato de creacion aceptado no transporta credenciales. La forma fisica
 * de tabla, constraint e indices requiere evidencia de migracion real (GAP
 * de APPLY: `drizzle/**` fuera de `allowed_paths`).
 */
export const identityUserSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  email: z.email().max(160),
  display_name: z.string().trim().min(1).max(160),
  status: z.enum(identityUserStatusValues),
  role_ids: z.array(z.uuid()).min(1),
  version: z.number().int().min(1),
  ...timestampSchema.shape,
});

export type IdentityUserSchema = z.infer<typeof identityUserSchema>;
export type IdentityUserStatus = (typeof identityUserStatusValues)[number];
