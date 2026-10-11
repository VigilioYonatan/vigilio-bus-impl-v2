import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Payload de creacion de tenant (`EP-TENANT-TENANTS-STORE-001`).
 *
 * Deriva del slice canonico `tenant` las dos unicas superficies aceptadas por
 * el contrato (`slug`, `name`) y canonicaliza `slug` una sola vez en el
 * boundary: `trim` del schema base mas `toLowerCase` (precedente
 * `user.schema.ts`). Es una mutacion: los campos no declarados se rechazan en
 * el borde (`strictObject`) para impedir mass-assignment de identidad/tenant
 * por body; ningun header de sesion se acepta como alias de estos campos.
 */
export const tenantsStoreRequestDto = z.strictObject({
  slug: tenantSchema.shape.slug.toLowerCase(),
  name: tenantSchema.shape.name,
});

export type TenantsStoreRequestDto = z.infer<typeof tenantsStoreRequestDto>;
