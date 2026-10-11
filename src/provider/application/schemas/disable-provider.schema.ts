import { z } from "zod";
import { providerSchema } from "./provider.schema";

/**
 * Vocabulario del comando `provider.disable-provider` (`class.md`).
 *
 * Se compone sobre el slice base `provider.schema.ts` y no agrega ninguna
 * columna al agregado: `reason` es la justificacion gobernada de la transicion
 * y existe solo en la request y en la evidencia append-only de auditoria
 * (jamas en la fila del provider, en logs o en telemetria).
 */

/**
 * Motivo gobernado de la deshabilitacion (`reason`): canonicalizado con `trim`
 * una sola vez en el boundary, 1..1000 caracteres.
 */
export const disableProviderReasonSchema = z.string().trim().min(1).max(1000);

/**
 * Identificador inmutable del provider objetivo (`providerId`, uuid del slice
 * base). La posesion del identificador jamas otorga alcance: el tenant de
 * confianza viaja como contexto separado y se refuerza en el repository.
 */
export const disableProviderIdSchema = providerSchema.shape.id;

/**
 * Valor de concurrencia optimista observado por el operador
 * (`expected_version`, entero >= 1). Un mismatch es 409 (`STALE_VERSION`) y
 * nunca last-write-wins.
 */
export const disableProviderExpectedVersionSchema = providerSchema.shape.version;
