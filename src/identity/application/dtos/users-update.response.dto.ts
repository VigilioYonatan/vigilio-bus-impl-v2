import { z } from "zod";
import { identityUserSchema } from "../schemas/identity-user.schema";

/**
 * Envelope de exito de `PATCH /users/{userId}`.
 *
 * `result` es la proyeccion publica confirmada del agregado `user` tras el
 * commit del compare-and-write (`display_name`/`role_ids` actualizados,
 * `version` incrementada y `updated_at` avanzado) y `version` es el valor de
 * concurrencia optimista post-commit que el siguiente comando debe usar como
 * `expected_version`. Secretos, hashes y stack traces estan prohibidos en
 * esta forma; jamas se retorna una fila Drizzle ni columnas internas.
 */
export const usersUpdateResponseDto = z.object({
  success: z.literal(true),
  result: identityUserSchema,
  version: z.number().int().min(1),
});

export type UsersUpdateResponseDto = z.infer<typeof usersUpdateResponseDto>;
