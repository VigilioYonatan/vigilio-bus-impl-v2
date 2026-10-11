import { z } from "zod";
import { providerSchema } from "../schemas/provider.schema";

/**
 * Envelope de exito de `POST /providers/{providerId}/disable`.
 *
 * `result` es la proyeccion publica confirmada del provider tras el commit
 * (estado `DISABLED` con el historial conservado; no se elimina ningun dato) y
 * `version` el valor de concurrencia optimista post-commit
 * (`expected_version + 1`). Secretos, credenciales y stack traces estan
 * prohibidos en esta forma; `reason` viaja solo a la evidencia de auditoria y
 * jamas entra a telemetria.
 */
export const disableProviderResponseDto = z.object({
  success: z.literal(true),
  result: providerSchema,
  version: z.number().int().min(1),
});

export type DisableProviderResponseDto = z.infer<typeof disableProviderResponseDto>;
