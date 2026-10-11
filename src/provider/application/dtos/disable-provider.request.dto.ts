import { z } from "zod";
import {
  disableProviderExpectedVersionSchema,
  disableProviderIdSchema,
  disableProviderReasonSchema,
} from "../schemas/disable-provider.schema";

/**
 * Parametros de ruta de `POST /providers/{providerId}/disable`
 * (`EP-PROVIDER-DISABLE-PROVIDER-001`).
 *
 * El contrato acepta exactamente el identificador inmutable del provider
 * (`id` uuid del slice canonico): no requiere coercion y cualquier otro valor
 * se rechaza antes de autorizar o consultar la base. La posesion del
 * identificador jamas otorga alcance.
 */
export const disableProviderParamsDto = z.object({
  providerId: disableProviderIdSchema,
});

export type DisableProviderParamsDto = z.infer<typeof disableProviderParamsDto>;

/**
 * Cuerpo aceptado por `POST /providers/{providerId}/disable`.
 *
 * Deriva del slice canonico las dos unicas superficies aceptadas por el
 * contrato: `expected_version` (detector de escrituras obsoletas) y `reason`
 * (justificacion gobernada de la transicion, canonicalizada con `trim` en el
 * boundary y enviada solo a la evidencia append-only de auditoria). Es una
 * mutacion: los campos no declarados se rechazan en el borde (`strictObject`)
 * para impedir mass-assignment de `tenant_id`/`status`/`version` por body;
 * ningun header de sesion se acepta como alias de estos campos.
 */
export const disableProviderRequestDto = z.strictObject({
  expected_version: disableProviderExpectedVersionSchema,
  reason: disableProviderReasonSchema,
});

export type DisableProviderRequestDto = z.infer<typeof disableProviderRequestDto>;
