import { z } from "zod";
import { identityUserSchema } from "../schemas/identity-user.schema";

/**
 * Parametros de ruta de `PATCH /users/{userId}`
 * (`EP-IDENTITY-USERS-UPDATE-001`).
 *
 * El contrato acepta exactamente el identificador inmutable del usuario
 * (`id` uuid del slice canonico): no requiere coercion y cualquier otro valor
 * se rechaza antes de autorizar o consultar la base. La posesion del
 * identificador jamas otorga acceso: la edicion es una capacidad privilegiada
 * tenant-scoped (`identity:users:update`) y el tenant de confianza viaja como
 * contexto separado, nunca desde path/query/body.
 */
export const usersUpdateParamsDto = z.object({
  userId: identityUserSchema.shape.id,
});

export type UsersUpdateParamsDto = z.infer<typeof usersUpdateParamsDto>;

/**
 * Cuerpo aceptado por `PATCH /users/{userId}`.
 *
 * Deriva del slice canonico `user` las tres unicas superficies aceptadas por
 * el contrato (`endpoints.md` §3):
 * - `display_name` (1..160, `trim` canonico una sola vez en el boundary) es
 *   un campo mutable opcional: su ausencia conserva el nombre vigente.
 * - `role_ids` (uuid[] >= 1) es un campo mutable opcional: su ausencia
 *   conserva los roles vigentes; el catalogo de roles pertenece a un
 *   registro canonico que no esta materializado (GAP-14) y aqui solo se
 *   aceptan identificadores opacos ya autorizados.
 * - `expected_version` es el valor de concurrencia optimista que el operador
 *   observo (`version` del registro); el mismatch es 409 `STALE_VERSION` y
 *   nunca last-write-wins.
 *
 * Es una mutacion: los campos no declarados se rechazan en el borde
 * (`strictObject`) para impedir mass-assignment de `tenant_id`/`email`/
 * `status`/`version`/`id` por body; ningun header de sesion se acepta como
 * alias de estos campos. Las transiciones de ciclo de vida pertenecen a
 * `disable-user`, no a este contrato.
 */
export const usersUpdateRequestDto = z.strictObject({
  display_name: identityUserSchema.shape.display_name.optional(),
  role_ids: identityUserSchema.shape.role_ids.optional(),
  expected_version: identityUserSchema.shape.version,
});

export type UsersUpdateRequestDto = z.infer<typeof usersUpdateRequestDto>;
