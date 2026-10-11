import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad privilegiada `identity:users:update`.
 *
 * Editar los campos mutables de un usuario es una mutacion tenant-scoped de
 * administracion: el agregado `user` es propiedad del contexto `identity` y la
 * operacion se ejecuta unicamente con el rol `admin` del vocabulario existente
 * del shared security — este pack no introduce un sistema de autorizacion
 * nuevo. El transporte la exige ademas con `@Roles("admin")` en el controller,
 * un identificador de tenant inyectado en la request jamas eleva el alcance
 * (el tenant viaja como contexto de confianza separado) y la visibilidad en la
 * UI nunca es autorizacion.
 *
 * D3 (confirmacion humana pendiente; recomendacion A del `design.md`): el
 * contrato aceptado no declara `STEP_UP_OR_APPROVAL_REQUIRED` para esta
 * operacion y Q-010 no la lista; la sensibilidad del `role_ids` opcional mapea
 * a la capacidad dedicada `identity.assign-role`. La determinacion se
 * implementa literal — no se consulta el puerto de step-up y nada se agrega
 * por inferencia — y la confirmacion del owner precede a cualquier activacion.
 */
export const USERS_UPDATE_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type UsersUpdateActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad; el llamador responde 403 sin revelar existencia ni contenido.
 */
export function canUpdateUsers(actor: UsersUpdateActor | null): boolean {
  return actor !== null && USERS_UPDATE_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toUsersUpdateActor(user: AuthenticatedUser | undefined): UsersUpdateActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
