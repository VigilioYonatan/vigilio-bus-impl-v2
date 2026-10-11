import { z } from "zod";
import { tenantSchema } from "../schemas/tenant.schema";

/**
 * Parametros de ruta de `PATCH /tenants/{tenantId}`
 * (`EP-TENANT-TENANTS-UPDATE-001`).
 *
 * El contrato acepta exactamente el identificador inmutable del tenant
 * (`id` uuid del slice canonico): no requiere coercion y cualquier otro valor
 * se rechaza antes de autorizar o consultar la base. La posesion del
 * identificador jamas otorga alcance: la edicion es una capacidad privilegiada
 * de administracion global (`tenant:tenants:update`).
 */
export const tenantsUpdateParamsDto = z.object({
  tenantId: tenantSchema.shape.id,
});

export type TenantsUpdateParamsDto = z.infer<typeof tenantsUpdateParamsDto>;

/**
 * Cuerpo aceptado por `PATCH /tenants/{tenantId}`.
 *
 * Deriva del slice canonico `tenant` las dos unicas superficies aceptadas por
 * el contrato (`endpoints.md` §3):
 * - `name` es el unico campo mutable del registro (nombre de presentacion,
 *   1..160, `trim` canonico una sola vez en el boundary); es opcional en el
 *   contrato HTTP y su ausencia no es un caso de error.
 * - `expected_version` es el valor de concurrencia optimista que el operador
 *   observo (`version` del registro); el mismatch es 409 `STALE_VERSION` y
 *   nunca last-write-wins.
 *
 * Es una mutacion: los campos no declarados se rechazan en el borde
 * (`strictObject`) para impedir mass-assignment de `id`/`slug`/`status`/
 * `suspension_reason`/`version`/`tenant_id` por body; ningun header de sesion
 * se acepta como alias de estos campos. Las transiciones de ciclo de vida
 * pertenecen a `suspend-tenant`/`reactivate-tenant`, no a este contrato.
 */
export const tenantsUpdateRequestDto = z.strictObject({
  name: tenantSchema.shape.name.optional(),
  expected_version: tenantSchema.shape.version,
});

export type TenantsUpdateRequestDto = z.infer<typeof tenantsUpdateRequestDto>;
