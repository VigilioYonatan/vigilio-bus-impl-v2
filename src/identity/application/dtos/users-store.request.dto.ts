import { z } from "zod";
import { identityUserSchema } from "../schemas/identity-user.schema";

/**
 * Payload de creacion de usuario (`EP-IDENTITY-USERS-STORE-001`).
 *
 * Deriva del slice canonico `user` las tres unicas superficies aceptadas por
 * el contrato (`email`, `display_name`, `role_ids`). El email se canonicaliza
 * una sola vez en el boundary: `trim` + `toLowerCase` antes de delegar en el
 * schema canonico del campo (en Zod 4 el formato de `z.email()` se evalua
 * sobre el valor tal como llega, por lo que la cadena `trim -> toLowerCase ->
 * pipe(email)` es la unica forma correcta de normalizar y validar a la vez).
 * Es una mutacion: los campos no declarados se rechazan en el borde
 * (`strictObject`) para impedir mass-assignment de `tenant_id`/`status`/
 * `version` por body; ningun header de sesion se acepta como alias de estos
 * campos, y el tenant del usuario creado jamas viaja en la request.
 */
export const usersStoreRequestDto = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(identityUserSchema.shape.email),
  display_name: identityUserSchema.shape.display_name,
  role_ids: identityUserSchema.shape.role_ids,
});

export type UsersStoreRequestDto = z.infer<typeof usersStoreRequestDto>;
