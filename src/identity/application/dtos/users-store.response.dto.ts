import { z } from "zod";
import { identityUserSchema } from "../schemas/identity-user.schema";

/**
 * Envelope de exito de `POST /users`.
 *
 * `result` es la proyeccion publica confirmada del agregado `user` (jamas una
 * fila Drizzle ni columnas internas) y `version` el valor de concurrencia
 * optimista post-commit; la creacion inicia en el default de base de datos
 * `1`. Secretos, hashes y stack traces estan prohibidos en esta forma.
 */
export const usersStoreResponseDto = z.object({
  success: z.literal(true),
  result: identityUserSchema,
  version: z.number().int().min(1),
});

export type UsersStoreResponseDto = z.infer<typeof usersStoreResponseDto>;
