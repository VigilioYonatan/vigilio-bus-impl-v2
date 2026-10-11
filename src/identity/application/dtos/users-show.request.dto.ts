import { z } from "zod";
import { identityUserSchema } from "../schemas/identity-user.schema";

/**
 * Parametros de ruta de `GET /users/{userId}` (`EP-IDENTITY-USERS-SHOW-001`).
 *
 * El contrato aceptado es exacto y estrecho: solo el identificador inmutable
 * del usuario (`id` uuid del slice canonico). La operacion no tiene cuerpo ni
 * query — cualquier otro valor se rechaza en el borde antes de autorizar o
 * consultar la base — y la request jamas transporta un selector de tenant: el
 * scope lo resuelve el contexto de confianza y la posesion del uuid no otorga
 * acceso por si sola.
 */
export const usersShowParamsDto = z.object({
  userId: identityUserSchema.shape.id,
});

export type UsersShowParamsDto = z.infer<typeof usersShowParamsDto>;
