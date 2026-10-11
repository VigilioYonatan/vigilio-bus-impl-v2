import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Parametros de ruta de `GET /tenants/{tenantId}` (`EP-TENANT-TENANTS-SHOW-001`).
 *
 * El contrato acepta exactamente el identificador inmutable del tenant
 * (`id` uuid del slice canonico): la operacion no tiene cuerpo ni query y
 * cualquier otro valor se rechaza antes de autorizar o consultar la base. La
 * posesion del identificador jamas otorga alcance: la lectura es una capacidad
 * privilegiada de administracion global (`tenant:tenants:show`).
 */
export const tenantsShowParamsDto = z.object({
  tenantId: tenantSchema.shape.id,
});

export type TenantsShowParamsDto = z.infer<typeof tenantsShowParamsDto>;
