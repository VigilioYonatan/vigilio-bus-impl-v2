import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

/**
 * Estados del ciclo de vida del tenant (`tenant.status`).
 *
 * `SUSPENDED` es un estado gobernado: la razon de suspension es obligatoria
 * mientras dura, y las transiciones pertenecen a los casos de uso de comando
 * del modulo (`suspend-tenant` / `reactivate-tenant`), no a este listado.
 */
export const tenantStatusValues = ["ACTIVE", "SUSPENDED"] as const;

/**
 * Proyeccion publica del registro global de tenants (`tenant`).
 *
 * Es el slice canonico del agregado `tenant`: identidad de enrutamiento
 * (`slug`), nombre de presentacion, estado, razon de suspension, version de
 * concurrencia optimista y timestamps UTC. El registro es global (no
 * tenant-scoped); el control de acceso es la capacidad privilegiada
 * `tenant:tenants:index`, no un predicado de fila, y no existen campos
 * secretos que redactar en esta proyeccion. La forma fisica de tabla,
 * constraint e indices requiere evidencia de migracion real (GAP de APPLY).
 */
export const tenantSchema = z.object({
  id: z.uuid(),
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  status: z.enum(tenantStatusValues),
  suspension_reason: z.string().trim().min(1).max(1000).nullable(),
  version: z.number().int().min(1),
  ...timestampSchema.shape,
});

export type TenantSchema = z.infer<typeof tenantSchema>;
export type TenantStatus = (typeof tenantStatusValues)[number];
