import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad `identity:users:store`.
 *
 * Crear un usuario es una mutacion tenant-scoped de administracion: el
 * agregado `user` es propiedad del contexto `identity` y la operacion se
 * ejecuta unicamente con el rol `admin` del vocabulario existente del shared
 * security — este pack no introduce un sistema de autorizacion nuevo. El
 * transporte la exige ademas con `@Roles("admin")` en el controller, un
 * identificador de tenant inyectado en la request jamas eleva el alcance (el
 * tenant viaja como contexto de confianza separado) y la visibilidad en la
 * UI nunca es autorizacion.
 */
export const USERS_STORE_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type UsersStoreActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad; el llamador responde 403 sin revelar existencia ni contenido.
 */
export function canStoreUsers(actor: UsersStoreActor | null): boolean {
  return actor !== null && USERS_STORE_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toUsersStoreActor(user: AuthenticatedUser | undefined): UsersStoreActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
