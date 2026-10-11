import { z } from "zod";
import { providerAccountSchema } from "../schemas/provider-account.schema";

/**
 * Envelope de exito de `POST /provider-accounts`.
 *
 * `result` es la proyeccion publica confirmada del agregado `provider_account`
 * (jamas una fila Drizzle ni columnas internas) y `version` el valor de
 * concurrencia optimista post-commit; la creacion inicia en el default de base
 * de datos `1`. Stack traces y detalles de persistencia estan prohibidos en
 * esta forma.
 *
 * D6 (NO confirmado) — fail-closed default (A): el `result` NO transporta
 * `secret_ref` ni ningun campo de secreto/referencia de secreto (ver
 * {@link providerAccountSchema}); la confirmacion de D6 puede ampliar la
 * proyeccion con un contrato versionado.
 */
export const providerAccountsStoreResponseDto = z.object({
  result: providerAccountSchema,
  success: z.literal(true),
  version: z.number().int().min(1),
});

export type ProviderAccountsStoreResponseDto = z.infer<typeof providerAccountsStoreResponseDto>;
