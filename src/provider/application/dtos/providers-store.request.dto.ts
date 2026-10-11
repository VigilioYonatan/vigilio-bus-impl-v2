import { z } from "zod";
import { providerSchema } from "../schemas/provider.schema";

/**
 * Payload de creacion de provider (`EP-PROVIDER-PROVIDERS-STORE-001`).
 *
 * Deriva del slice canonico las dos unicas superficies aceptadas por el
 * contrato (`code`, `name`) y canonicaliza `code` una sola vez en el
 * boundary: `trim` del schema base mas `toLowerCase` (misma primitiva slug
 * del sibling `tenants-store`). El valor almacenado es la identidad de
 * negocio durable local al tenant `(tenant_id, code)`. Es una mutacion: los
 * campos no declarados se rechazan en el borde (`strictObject`) para impedir
 * mass-assignment de `tenant_id`/`status`/`version` por body; ningun header
 * de sesion se acepta como alias de estos campos y el tenant del provider
 * creado jamas viaja en la request.
 */
export const providersStoreRequestDto = z.strictObject({
  code: providerSchema.shape.code.toLowerCase(),
  name: providerSchema.shape.name,
});

export type ProvidersStoreRequestDto = z.infer<typeof providersStoreRequestDto>;
