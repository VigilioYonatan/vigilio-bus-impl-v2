import type { AuthenticatedUser } from "@/shared/infrastructure/security/authenticated-request";

/**
 * Mapeo ejecutable de la capacidad privilegiada `tenant:suspend:tenant`.
 *
 * Suspender un tenant es una transicion de ciclo de vida de administracion
 * global: el registro es propiedad del contexto `tenant` y la operacion se
 * ejecuta unicamente con el rol `admin` del vocabulario existente del shared
 * security — este pack no introduce un sistema de autorizacion nuevo. El
 * transporte la exige ademas con `@Roles("admin")` en el controller, un
 * identificador de tenant en la request jamas eleva el alcance y la
 * visibilidad en la UI nunca es autorizacion.
 */
export const TENANTS_SUSPEND_ROLES: readonly AuthenticatedUser["role"][] = ["admin"];

export type TenantsSuspendActor = Pick<AuthenticatedUser, "id" | "role">;

/**
 * Precondicion deny-by-default del caso de uso.
 *
 * Devuelve `false` cuando no hay actor autenticado (invocacion fuera del
 * pipeline HTTP o sesion ausente) o el rol no esta autorizado para la
 * capacidad; el llamador responde 403 sin revelar existencia ni contenido del
 * registro.
 */
export function canSuspendTenants(actor: TenantsSuspendActor | null): boolean {
  return actor !== null && TENANTS_SUSPEND_ROLES.includes(actor.role);
}

/**
 * Proyecta el usuario autenticado del transporte al actor del caso de uso.
 *
 * El controller es el unico punto que lee `request.user`; la capa de
 * aplicacion recibe un contrato nombrado y no depende de Express/Nest.
 */
export function toTenantsSuspendActor(
  user: AuthenticatedUser | undefined,
): TenantsSuspendActor | null {
  return user ? { id: user.id, role: user.role } : null;
}
