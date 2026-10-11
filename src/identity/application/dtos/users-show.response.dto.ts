import { z } from "zod";
import { identityUserSchema } from "../schemas/identity-user.schema";

/**
 * Envelope de exito de `GET /users/{userId}`.
 *
 * `result` es la proyeccion publica confirmada del agregado `user` (jamas una
 * fila Drizzle ni columnas internas). `version` vive dentro de la proyeccion
 * como detector de obsolescencia de las mutaciones posteriores
 * (`users-update`) y no existe un `version` de nivel superior: una lectura no
 * produce estado post-commit. Secretos, material de password, hashes, stack
 * traces y columnas de persistencia estan prohibidos en esta forma.
 */
export const usersShowResponseDto = z.object({
  success: z.literal(true),
  result: identityUserSchema,
});

export type UsersShowResponseDto = z.infer<typeof usersShowResponseDto>;
