import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad `identity:users:show`.
 *
 * Leer el detalle de un usuario es una lectura tenant-scoped de
 * administracion del contexto `identity`: la operacion se ejecuta unicamente
 * con el rol `admin` del vocabulario existente del shared security — este
 * pack no introduce un sistema de autorizacion nuevo. El transporte la exige
 * ademas con `@Roles("admin")` en el controller, el scope de tenant viaja
 * como contexto de confianza separado (jamas desde path/query/body) y la
 * posesion del uuid de un usuario ajeno jamas eleva el alcance: UI visibility
 * nunca es autorizacion.
 *
 * Es una lectura sin transicion de estado: el contrato canonico no declara
 * una precondicion de step-up/aprobacion (Q-010 no clasifica esta lectura
 * ordinaria como privilegiada con efecto; nada se agrega por inferencia).
 */
export const USERS_SHOW_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type UsersShowActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad. El llamador responde 403 sin revelar existencia ni contenido, y
 * el 404 posterior es igualmente no revelador dentro del alcance autorizado
 * (ausencia y recurso de otro tenant son indistinguibles).
 */
export function canShowUsers(actor: UsersShowActor | null): boolean {
  return actor !== null && USERS_SHOW_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toUsersShowActor(user: AuthenticatedUser | undefined): UsersShowActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
